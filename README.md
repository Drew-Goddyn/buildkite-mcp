# Buildkite MCP Server

A Model Context Protocol (MCP) server for interacting with the Buildkite API. This package provides endpoints for querying organizations, pipelines, builds, jobs, and logs from your Buildkite CI/CD environment.

## Features

* **Organization & Pipeline Discovery**: List all accessible organizations and pipelines
* **Build Filtering**: Filter builds by branch, state, and other attributes
* **Job Management**: List, inspect, and retry jobs within builds
* **Failure Analysis**: Quickly identify failed jobs and access their logs
* **Comprehensive Error Handling**: Clear error messages for common issues
* **Test Failure Parsing**: Extract and parse test failures from various test frameworks (RSpec, Jest, Karma, Cypress)

## Installation

```bash
npm install @drew-goddyn/buildkite-mcp
```

## Setup

### Buildkite Access Token

Create a Buildkite API Access Token with appropriate permissions:

1. Go to Buildkite's [API Access Tokens](https://buildkite.com/user/api-access-tokens) page
2. Click "New API Access Token"
3. Name your token and select the appropriate scopes:
   * `read_builds` - Required for listing and viewing builds and jobs
   * `read_organizations` - Required for listing organizations
   * `read_pipelines` - Required for listing pipelines
   * `write_builds` - Required if you want to retry jobs
4. Copy the generated token

### Configuration

The server requires a Buildkite access token with appropriate permissions. You can configure this in your MCP configuration file (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "buildkite": {
      "command": "npx",
      "args": [
        "-y",
        "@drew-goddyn/buildkite-mcp"
      ],
      "env": {
        "BUILDKITE_ACCESS_TOKEN": "your-buildkite-access-token"
      }
    }
  }
}
```

## Tools

1. `mcp_buildkite_list_organizations`
   * List all organizations the authenticated user has access to
   * Returns: Array of organization details

2. `mcp_buildkite_list_pipelines`
   * List all pipelines in an organization
   * Inputs:
     * `organization` (string): The Buildkite organization slug
   * Returns: Array of pipeline details

3. `mcp_buildkite_list_builds`
   * List builds from a Buildkite pipeline with optional filtering
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `per_page` (optional number): Number of builds per page (default: 10)
     * `page` (optional number): Page number (default: 1)
     * `branch` (optional string): Filter builds by branch
     * `state` (optional string): Filter builds by state
   * Returns: Array of build details

4. `mcp_buildkite_get_build`
   * Get detailed information about a specific build
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `build_number` (number): The build number to retrieve
   * Returns: Detailed build information including jobs

5. `mcp_buildkite_list_jobs`
   * List all jobs from a build regardless of status
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `build_number` (number): The build number to retrieve jobs from
   * Returns: Array of job details

6. `mcp_buildkite_list_failed_jobs`
   * List only failed jobs from a build for quick failure analysis
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `build_number` (number): The build number to retrieve failed jobs from
   * Returns: Array of failed job details

7. `mcp_buildkite_get_job_log`
   * Get the full console output logs for a specific job
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `build_number` (number): The build number
     * `job_id` (string): The job ID to retrieve logs from
   * Returns: Job log content

8. `mcp_buildkite_retry_job`
   * Retry a specific failed job in a build
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `build_number` (number): The build number containing the job
     * `job_id` (string): The job ID to retry
   * Returns: Updated job information

9. `mcp_buildkite_list_pipeline_build_failures`
   * List build failures from a specific pipeline for quick failure analysis
   * Inputs:
     * `organization` (string): The Buildkite organization slug
     * `pipeline` (string): The Buildkite pipeline slug
     * `state` (optional string): Filter builds by state (default: "finished")
     * `per_page` (optional number): Number of builds per page (default: 20)
     * `page` (optional number): Page number (default: 1)
   * Returns: Array of build failures with formatted job details

10. `mcp_buildkite_list_job_spec_failures`
    * Extract test spec failures from a specific job in a pipeline
    * Inputs:
      * `organization` (string): The Buildkite organization slug
      * `pipeline` (string): The Buildkite pipeline slug
      * `build_number` (number): The build number to analyze
      * `job_id` (string): The job ID to extract spec failures from
    * Returns: Array of parsed test failures with details

## Usage Examples

### List Organizations

```json
{
  "name": "mcp_buildkite_list_organizations",
  "parameters": {}
}
```

### List Pipelines

```json
{
  "name": "mcp_buildkite_list_pipelines",
  "parameters": {
    "organization": "your-org-slug"
  }
}
```

### List Builds

```json
{
  "name": "mcp_buildkite_list_builds",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "per_page": 10,
    "page": 1,
    "branch": "main",
    "state": "failed"
  }
}
```

### Get Build Details

```json
{
  "name": "mcp_buildkite_get_build",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123
  }
}
```

### List All Jobs for a Build

```json
{
  "name": "mcp_buildkite_list_jobs",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123
  }
}
```

### List Failed Jobs for a Build

```json
{
  "name": "mcp_buildkite_list_failed_jobs",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123
  }
}
```

### Get Job Log

```json
{
  "name": "mcp_buildkite_get_job_log",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123,
    "job_id": "job-id-from-list-jobs"
  }
}
```

### Retry a Failed Job

```json
{
  "name": "mcp_buildkite_retry_job",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123,
    "job_id": "job-id-from-list-jobs"
  }
}
```

### List Pipeline Build Failures

```json
{
  "name": "mcp_buildkite_list_pipeline_build_failures",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "state": "finished",
    "per_page": 10,
    "page": 1
  }
}
```

### Extract Spec Failures from a Job

```json
{
  "name": "mcp_buildkite_list_job_spec_failures",
  "parameters": {
    "organization": "your-org-slug",
    "pipeline": "your-pipeline-slug",
    "build_number": 123,
    "job_id": "job-id-from-list-jobs"
  }
}
```

## Development

To run the server locally:

```bash
BUILDKITE_ACCESS_TOKEN=your-token npm start
```

The server will automatically select an available port, or you can still specify a custom port with the `PORT` environment variable if needed.

## Error Handling

The server provides detailed error messages for common issues:
- `401`: Authentication failed - check your Buildkite access token
- `404`: Resource not found - check your organization, pipeline, or build information
- Other errors include the full error message from the Buildkite API

## License

ISC 