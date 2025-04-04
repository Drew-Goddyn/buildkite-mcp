#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Start the server
app.listen(PORT, () => {
  console.log(`Buildkite MCP server running on port ${PORT}`);
  console.log(`Server is using Buildkite API with token: ${process.env.BUILDKITE_ACCESS_TOKEN ? 'PROVIDED' : 'MISSING'}`);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 