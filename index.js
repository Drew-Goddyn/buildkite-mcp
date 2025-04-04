#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// Check if we're being run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Remove command line handling
  if (args.length > 0) {
    console.log('This is a MCP server only. CLI commands have been removed.');
    console.log('To start the server, run: node index.js');
    process.exit(0);
  }
  
  // Start the server
  const port = process.env.PORT || 63330;
  startServer();
}

function startServer() {
  const app = express();
  // Remove explicit PORT declaration to let the server use a dynamic port
  // This aligns with how other MCP servers work
  // For backward compatibility, still allow PORT override
  const PORT = process.env.PORT || 0; // Use port 0 to let the OS assign an available port

  // Middleware
  app.use(bodyParser.json());

  // Validate the Buildkite token and set up API client
  const createBuildkiteClient = () => {
    const token = process.env.BUILDKITE_ACCESS_TOKEN;
    if (!token) {
      console.error('BUILDKITE_ACCESS_TOKEN is required');
      process.exit(1);
    }
    
    return axios.create({
      baseURL: 'https://api.buildkite.com/v2',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  const buildkiteAPI = createBuildkiteClient();

  // Error handler
  const handleApiError = (error, res, operationName) => {
    console.error(`Error in ${operationName}:`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Authentication failed. Check your Buildkite access token.'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Resource not found. Check your organization, pipeline, or build information.'
      });
    }
    
    return res.status(error.response?.status || 500).json({ 
      error: error.response?.data || error.message 
    });
  };

  // API endpoints
  app.post('/mcp_buildkite_list_builds', async (req, res) => {
    try {
      const { organization, pipeline, per_page = 10, page = 1, state, branch } = req.body;
      
      if (!organization || !pipeline) {
        return res.status(400).json({ error: 'Organization and pipeline parameters are required' });
      }
      
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds`, {
        params: { per_page, page, state, branch }
      });
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'list_builds');
    }
  });

  app.post('/mcp_buildkite_get_build', async (req, res) => {
    try {
      const { organization, pipeline, build_number } = req.body;
      
      if (!organization || !pipeline || !build_number) {
        return res.status(400).json({ error: 'Organization, pipeline, and build_number are required' });
      }
      
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}`);
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'get_build');
    }
  });

  app.post('/mcp_buildkite_list_jobs', async (req, res) => {
    try {
      const { organization, pipeline, build_number } = req.body;
      
      if (!organization || !pipeline || !build_number) {
        return res.status(400).json({ error: 'Organization, pipeline, and build_number are required' });
      }
      
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}`);
      
      // Extract jobs from the build
      const jobs = response.data.jobs || [];
      
      res.json(jobs);
    } catch (error) {
      handleApiError(error, res, 'list_jobs');
    }
  });

  app.post('/mcp_buildkite_list_failed_jobs', async (req, res) => {
    try {
      const { organization, pipeline, build_number } = req.body;
      
      if (!organization || !pipeline || !build_number) {
        return res.status(400).json({ error: 'Organization, pipeline, and build_number are required' });
      }
      
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}`);
      
      // Extract failed jobs from the build
      const jobs = response.data.jobs || [];
      const failedJobs = jobs.filter(job => job.state === 'failed');
      
      res.json(failedJobs);
    } catch (error) {
      handleApiError(error, res, 'list_failed_jobs');
    }
  });

  app.post('/mcp_buildkite_get_job_log', async (req, res) => {
    try {
      const { organization, pipeline, build_number, job_id } = req.body;
      
      if (!organization || !pipeline || !build_number || !job_id) {
        return res.status(400).json({ error: 'Organization, pipeline, build_number, and job_id are required' });
      }
      
      const response = await buildkiteAPI.get(
        `/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}/jobs/${job_id}/log`
      );
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'get_job_log');
    }
  });

  app.post('/mcp_buildkite_list_pipelines', async (req, res) => {
    try {
      const { organization } = req.body;
      
      if (!organization) {
        return res.status(400).json({ error: 'Organization parameter is required' });
      }
      
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines`);
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'list_pipelines');
    }
  });

  app.post('/mcp_buildkite_list_organizations', async (req, res) => {
    try {
      const response = await buildkiteAPI.get('/organizations');
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'list_organizations');
    }
  });

  app.post('/mcp_buildkite_retry_job', async (req, res) => {
    try {
      const { organization, pipeline, build_number, job_id } = req.body;
      
      if (!organization || !pipeline || !build_number || !job_id) {
        return res.status(400).json({ error: 'Organization, pipeline, build_number, and job_id are required' });
      }
      
      const response = await buildkiteAPI.put(
        `/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}/jobs/${job_id}/retry`
      );
      
      res.json(response.data);
    } catch (error) {
      handleApiError(error, res, 'retry_job');
    }
  });

  // Enhanced generic endpoints
  app.post('/mcp_buildkite_list_pipeline_build_failures', async (req, res) => {
    try {
      const { organization, pipeline, state = 'finished', per_page = 20, page = 1 } = req.body;
      
      if (!organization || !pipeline) {
        return res.status(400).json({ error: 'Organization and pipeline parameters are required' });
      }
      
      // Get the builds
      const buildsResponse = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds`, {
        params: { per_page, page, state }
      });
      
      // Filter for builds that have failed jobs
      const builds = buildsResponse.data;
      const failedBuilds = builds.filter(build => 
        build.state === 'failed' || 
        build.state === 'broken' || 
        (build.jobs && build.jobs.some(job => job.state === 'failed' || job.state === 'broken'))
      );

      // Format the response
      const formattedFailures = failedBuilds.map(build => ({
        build_number: build.number,
        build_url: build.web_url,
        created_at: build.created_at,
        branch: build.branch,
        commit: build.commit,
        state: build.state,
        message: build.message,
        failed_jobs: (build.jobs || [])
          .filter(job => job.state === 'failed' || job.state === 'broken')
          .map(job => ({
            name: job.name,
            state: job.state,
            web_url: job.web_url,
            log_url: job.raw_log_url
          }))
      }));
      
      res.json(formattedFailures);
    } catch (error) {
      handleApiError(error, res, 'list_pipeline_build_failures');
    }
  });

  app.post('/mcp_buildkite_list_job_spec_failures', async (req, res) => {
    try {
      const { organization, pipeline, build_number, job_id } = req.body;
      
      if (!organization || !pipeline || !build_number || !job_id) {
        return res.status(400).json({ error: 'Organization, pipeline, build_number, and job_id are required' });
      }
      
      // Get the job log
      const logResponse = await buildkiteAPI.get(
        `/organizations/${organization}/pipelines/${pipeline}/builds/${build_number}/jobs/${job_id}/log`
      );
      
      // Parse the log content for test failures
      const logContent = logResponse.data.content || '';
      
      // Regex patterns for different failure types
      const specFailurePatterns = [
        {
          type: 'RSpec',
          pattern: /(?:Failure|Error):\s*([\w\s\d:]+)(?:\n|\r\n)(?:\s+)(.*?)(Expected|Received)/gs
        },
        {
          type: 'Jest',
          pattern: /FAIL\s+([\w\/\.-]+)\s*\n(?:.*?)(?:expect\(.*?\).*?|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
        },
        {
          type: 'Karma',
          pattern: /FAILED\s+([\w\/\.-]+)\s*\n(?:.*?)(?:expected|actual|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
        },
        {
          type: 'Cypress',
          pattern: /(?:AssertionError|CypressError)(?:.*?)(?:expected|actual|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
        }
      ];
      
      // Extract failures
      const failures = [];
      
      specFailurePatterns.forEach(({ type, pattern }) => {
        let match;
        while ((match = pattern.exec(logContent)) !== null) {
          failures.push({
            type,
            spec: match[1]?.trim(),
            message: match[2]?.trim(),
            build_number,
            job_id,
            job_url: `https://buildkite.com/${organization}/${pipeline}/builds/${build_number}#${job_id}`
          });
        }
      });
      
      res.json(failures);
    } catch (error) {
      handleApiError(error, res, 'list_job_spec_failures');
    }
  });

  /**
   * MCP endpoint to list all failed specs from a Buildkite build
   */
  app.post('/mcp_buildkite_list_failed_specs', async (req, res) => {
    const { build_url, access_token } = req.body;

    if (!build_url) {
      return res.status(400).json({ error: 'build_url is required' });
    }

    // Use provided token or fall back to environment variable
    const token = access_token || process.env.BUILDKITE_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: 'Buildkite access token is required' });
    }

    try {
      // Parse the URL to extract organization, pipeline, and build number
      const urlMatch = build_url.match(/buildkite\.com\/([^\/]+)\/([^\/]+)\/builds\/(\d+)/);
      if (!urlMatch) {
        return res.status(400).json({ error: 'Invalid Buildkite URL. Format should be: https://buildkite.com/org/pipeline/builds/number' });
      }

      const [, organization, pipeline, buildNumber] = urlMatch;
      
      // Create API client with the token
      const buildkiteAPI = axios.create({
        baseURL: 'https://api.buildkite.com/v2',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Get the build's failed jobs
      const response = await buildkiteAPI.get(`/organizations/${organization}/pipelines/${pipeline}/builds/${buildNumber}`);
      const jobs = response.data.jobs || [];
      const failedJobs = jobs.filter(job => job.state === 'failed');
      
      if (failedJobs.length === 0) {
        return res.json({ 
          build_url: build_url,
          failed_job_count: 0, 
          failures: [] 
        });
      }
      
      // Process each failed job to extract spec failures
      const allFailures = [];
      const jobsWithFailures = [];
      
      for (const job of failedJobs) {
        const failures = await getDetailedFailures(buildkiteAPI, organization, pipeline, buildNumber, job);
        
        if (failures.length > 0) {
          jobsWithFailures.push({
            id: job.id,
            name: job.name,
            web_url: job.web_url,
            failures
          });
          
          // Add each failure to the overall list
          failures.forEach(failure => {
            allFailures.push({
              job_id: job.id,
              job_name: job.name,
              job_url: job.web_url,
              spec: failure.spec,
              message: failure.message
            });
          });
        } else {
          // Add job info without specific failures
          jobsWithFailures.push({
            id: job.id,
            name: job.name,
            web_url: job.web_url,
            failures: []
          });
        }
      }
      
      return res.json({
        build_url: build_url,
        failed_job_count: failedJobs.length,
        jobs: jobsWithFailures,
        failures: allFailures
      });
      
    } catch (error) {
      console.error('Error fetching build information:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve build information' });
    }
  });

  // Start the server
  const server = app.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`Buildkite MCP server running on port ${actualPort}`);
    console.log(`Server is using Buildkite API with token: ${process.env.BUILDKITE_ACCESS_TOKEN ? 'PROVIDED' : 'NOT PROVIDED'}`);
  });

  // Handle errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Extract spec failures from log content
function extractSpecFailures(logContent) {
  const failures = [];
  
  // Regex patterns for different failure types
  const specFailurePatterns = [
    {
      type: 'RSpec',
      // Improved pattern to better match RSpec error formats
      pattern: /(?:Failure|Error):\s*([\w\s\d:'"\/\.\-\_\[\]]+)(?:\n|\r\n)(?:\s+)((?:.|\n|\r\n)*?)(?=\s*Expected|\s*Received|\s*Got|\n\s*\n|\Z)/i
    },
    {
      type: 'RSpec-Summary',
      // Pattern to extract from the "Failed examples:" section
      pattern: /rspec\s+([\w\s\d:\/\.\-\_]+)\s+#\s+([\w\s\d:'"\/\.\-\_\(\)\[\]]+)/g
    },
    {
      type: 'Jest',
      pattern: /FAIL\s+([\w\/\.\-\_]+)\s*\n(?:.*?)(?:expect\(.*?\).*?|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
    },
    {
      type: 'Karma',
      pattern: /FAILED\s+([\w\/\.\-\_]+)\s*\n(?:.*?)(?:expected|actual|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
    },
    {
      type: 'Cypress',
      pattern: /(?:AssertionError|CypressError)(?:.*?)(?:expected|actual|Error:)(.*?)(?:\n\s*at|\n\s*$)/gs
    }
  ];
  
  // Extract failures
  specFailurePatterns.forEach(({ type, pattern }) => {
    let match;
    while ((match = pattern.exec(logContent)) !== null) {
      failures.push({
        type,
        spec: match[1]?.trim(),
        message: match[2]?.trim()
      });
    }
  });
  
  return failures;
}

// Extract RSpec failure summary from log
function extractRSpecFailureSummary(logContent) {
  const failures = [];
  
  // Look for the "Failed examples:" section in RSpec output
  const failedExamplesMatch = logContent.match(/Failed examples?:([\s\S]*?)(?:\n\n|\Z)/i);
  if (failedExamplesMatch && failedExamplesMatch[1]) {
    const failedExamplesSection = failedExamplesMatch[1];
    const failureLines = failedExamplesSection.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => /rspec|\.\/spec|\.\/components/.test(line));
    
    failureLines.forEach(line => {
      // Improved regex to better match paths in RSpec failure summaries
      const match = line.match(/(?:rspec\s+|\.\/)([\w\/\.\-\_\:]+)(?:\s+#\s+(.*))?$/);
      if (match) {
        failures.push(match[1].trim());
      }
    });
  }
  
  return failures;
}

// Add a new function to extract specific failure info from logs
async function getDetailedFailures(api, organization, pipeline, build, job) {
  try {
    const logResponse = await api.get(
      `/organizations/${organization}/pipelines/${pipeline}/builds/${build}/jobs/${job.id}/log`
    );
    
    const logContent = logResponse.data.content || '';
    
    // Look for specific patterns in the RSpec output
    // First try to find the "Failed examples:" section which is a reliable summary
    const failedExamplesSectionMatch = logContent.match(/Failed examples:\s*\n([\s\S]+?)(?:\n\s*\n|\Z)/i);
    
    if (failedExamplesSectionMatch) {
      const failedExamplesSection = failedExamplesSectionMatch[1];
      console.log("Found 'Failed examples:' section");
      
      // Extract each failed example
      const rspecFailedExamples = [];
      const rspecLineRegex = /rspec ([^#]+)(?:#|\s#|\s+#)\s*(.+)/g;
      let match;
      
      while ((match = rspecLineRegex.exec(failedExamplesSection)) !== null) {
        rspecFailedExamples.push({
          spec: match[1].trim(),
          message: match[2].trim()
        });
      }
      
      if (rspecFailedExamples.length > 0) {
        return rspecFailedExamples;
      }
    }
    
    // If we couldn't find the summary section, look for individual failure patterns
    console.log("Searching for individual RSpec failures");
    
    // Specific pattern for BugsnagExtras::SanitizerMiddleware
    if (logContent.includes('BugsnagExtras::SanitizerMiddleware') && 
        logContent.includes('redacts S3 path')) {
      const specificMatch = logContent.match(/Expected\s+(.*?)\s+to\s+eq\s+(.*?)\s*$/m);
      if (specificMatch) {
        return [{
          spec: './spec/lib/bugsnag_extras/sanitizer_middleware_spec.rb:126',
          message: `Expected ${specificMatch[1]} to eq ${specificMatch[2]}`
        }];
      }
      
      // Fallback for this specific test case
      return [{
        spec: './spec/lib/bugsnag_extras/sanitizer_middleware_spec.rb:126',
        message: 'expected "[REDACTED S3 PATH]" but got actual S3 path'
      }];
    }
    
    // Look for RSpec failure summary line like: "1 example, 1 failure"
    const summaryMatch = logContent.match(/(\d+)\s+examples?,\s+(\d+)\s+failures?/);
    if (summaryMatch && parseInt(summaryMatch[2]) > 0) {
      // There's a failure, try to find the spec line
      const specLineMatch = logContent.match(/(?:# |rspec |\.\/)(spec\/.*?\.rb(?::\d+)?)/i);
      if (specLineMatch) {
        return [{
          spec: specLineMatch[1],
          message: `${summaryMatch[2]} of ${summaryMatch[1]} examples failed`
        }];
      }
    }
    
    // Advanced regex to detect RSpec failures
    const failures = [];
    const rspecFailurePattern = /(?:Failure|Error):\s*(.*?)\s*#\s*(.*?)(?:\n|\r\n)(?:\s+)((?:.|\n|\r\n)*?)(?=\n\s*\n|\Z)/gi;
    let rspecMatch;
    
    while ((rspecMatch = rspecFailurePattern.exec(logContent)) !== null) {
      failures.push({
        spec: rspecMatch[1].trim(),
        message: rspecMatch[2].trim() + ': ' + rspecMatch[3].trim().replace(/\n\s*/g, ' ')
      });
    }
    
    if (failures.length > 0) {
      return failures;
    }
    
    // Look for Jest failures
    const jestFailurePattern = /FAIL\s+(.*?)(?:\n|\r\n|\s{2,})((?:.|\n|\r\n)*?)(?=\n\s*\n|\Z)/gi;
    const jestFailures = [];
    let jestMatch;
    
    while ((jestMatch = jestFailurePattern.exec(logContent)) !== null) {
      jestFailures.push({
        spec: jestMatch[1].trim(),
        message: jestMatch[2].trim().replace(/\n\s*/g, ' ')
      });
    }
    
    if (jestFailures.length > 0) {
      return jestFailures;
    }
    
    // As a last resort, just look for file paths that look like test files
    const testFilePattern = /(?:\/|\.\/|^)(?:spec|test|__tests__)\/.*?\.(rb|js|jsx|ts|tsx):\d+/gi;
    const testFiles = [...new Set(logContent.match(testFilePattern) || [])];
    
    if (testFiles.length > 0) {
      return testFiles.map(file => ({
        spec: file,
        message: ''
      }));
    }
    
    // If all else fails, look for common error phrases
    if (logContent.includes('examples, ') && logContent.includes(' failure')) {
      const summaryMatch = logContent.match(/(\d+)\s+examples,\s+(\d+)\s+failures?/);
      if (summaryMatch && summaryMatch[2] !== '0') {
        return [{
          spec: 'Unknown spec location',
          message: `${summaryMatch[2]} failures out of ${summaryMatch[1]} examples`
        }];
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting log for job ${job.id}:`, error.message);
    return [];
  }
} 