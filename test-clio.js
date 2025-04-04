#!/usr/bin/env node

/**
 * Test script for Buildkite MCP endpoints
 * 
 * Run this script with:
 *   BUILDKITE_ACCESS_TOKEN=your_token node test.js
 *   
 * Optionally specify organization and pipeline:
 *   BUILDKITE_ACCESS_TOKEN=your_token BUILDKITE_ORG=your-org BUILDKITE_PIPELINE=your-pipeline node test.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // MCP server URL
const BUILDKITE_TOKEN = process.env.BUILDKITE_ACCESS_TOKEN;
const DEFAULT_ORG = process.env.BUILDKITE_ORG || 'your-organization'; // Default organization to test with
const DEFAULT_PIPELINE = process.env.BUILDKITE_PIPELINE || 'your-pipeline'; // Default pipeline to test with

if (!BUILDKITE_TOKEN) {
  console.error('Error: BUILDKITE_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

// API client
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test functions
async function testListBuildFailures() {
  console.log(`\n=== Testing mcp_buildkite_list_pipeline_build_failures with ${DEFAULT_ORG}/${DEFAULT_PIPELINE} ===`);
  
  try {
    const response = await client.post('/mcp_buildkite_list_pipeline_build_failures', {
      organization: DEFAULT_ORG,
      pipeline: DEFAULT_PIPELINE,
      state: 'finished',
      per_page: 5,
      page: 1
    });
    
    console.log(`Found ${response.data.length} failed builds`);
    
    if (response.data.length > 0) {
      const build = response.data[0];
      console.log('\nExample Build Failure:');
      console.log(`Build #${build.build_number} (${build.branch})`);
      console.log(`Status: ${build.state}`);
      console.log(`URL: ${build.build_url}`);
      console.log(`Message: ${build.message}`);
      console.log('\nFailed Jobs:');
      
      if (build.failed_jobs && build.failed_jobs.length > 0) {
        build.failed_jobs.forEach(job => {
          console.log(`- ${job.name} (${job.state}): ${job.web_url}`);
        });
        
        // Save the first failed job for spec testing
        return {
          build_number: build.build_number,
          job_id: build.failed_jobs[0].web_url.split('#')[1]
        };
      } else {
        console.log('No failed jobs found in this build');
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error listing build failures:', error.response?.data || error.message);
    return null;
  }
}

async function testListSpecFailures(build_number, job_id) {
  console.log(`\n=== Testing mcp_buildkite_list_job_spec_failures with ${DEFAULT_ORG}/${DEFAULT_PIPELINE} ===`);
  
  if (!build_number || !job_id) {
    console.log('No build/job info available for spec failure testing');
    return;
  }
  
  console.log(`Analyzing build #${build_number}, job ${job_id}`);
  
  try {
    const response = await client.post('/mcp_buildkite_list_job_spec_failures', {
      organization: DEFAULT_ORG,
      pipeline: DEFAULT_PIPELINE,
      build_number,
      job_id
    });
    
    console.log(`Found ${response.data.length} spec failures`);
    
    if (response.data.length > 0) {
      console.log('\nExample Spec Failures:');
      response.data.slice(0, 3).forEach((failure, index) => {
        console.log(`\n${index + 1}. Type: ${failure.type}`);
        console.log(`   Spec: ${failure.spec}`);
        console.log(`   Message: ${failure.message}`);
        console.log(`   URL: ${failure.job_url}`);
      });
    }
  } catch (error) {
    console.error('Error listing spec failures:', error.response?.data || error.message);
  }
}

// Main function
async function main() {
  console.log(`Testing Buildkite MCP endpoints with organization: ${DEFAULT_ORG}, pipeline: ${DEFAULT_PIPELINE}...`);
  
  try {
    // Test listing build failures with the generic endpoint
    const buildInfo = await testListBuildFailures();
    
    // Test listing spec failures if we have a failed build
    if (buildInfo) {
      await testListSpecFailures(buildInfo.build_number, buildInfo.job_id);
    }
    
    console.log('\nTests completed!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the tests
main(); 