# Buildkite MCP Server

A microservice for retrieving information from Buildkite via Model Context Protocol (MCP).

## Setup

1. Clone this repository
2. Run `npm install`
3. Set the `BUILDKITE_ACCESS_TOKEN` environment variable
4. Start the server with `node index.js`

## MCP Endpoints

### List Organizations

```
POST /mcp_buildkite_list_organizations
```

**Request Body:**
```json
{
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "id": "org-id",
    "name": "Organization Name",
    "slug": "organization-slug"
  }
]
```

### List Pipelines

```
POST /mcp_buildkite_list_pipelines
```

**Request Body:**
```json
{
  "organization": "my-org",
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "id": "pipeline-id",
    "name": "Pipeline Name",
    "slug": "pipeline-slug"
  }
]
```

### List Builds

```
POST /mcp_buildkite_list_builds
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "access_token": "optional-if-set-in-env",
  "branch": "main",
  "state": "failed",
  "per_page": 10,
  "page": 1
}
```

**Response:**
```json
[
  {
    "id": "build-id",
    "number": 123,
    "state": "failed"
  }
]
```

### Get Build Details

```
POST /mcp_buildkite_get_build
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
{
  "id": "build-id",
  "number": 123,
  "jobs": [
    {
      "id": "job-id",
      "name": "Job Name",
      "state": "failed"
    }
  ]
}
```

### List All Jobs

```
POST /mcp_buildkite_list_jobs
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "id": "job-id",
    "name": "Job Name",
    "state": "failed"
  }
]
```

### List Failed Jobs

```
POST /mcp_buildkite_list_failed_jobs
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "id": "01234567-89ab-cdef-0123-456789abcdef",
    "name": "Test Job",
    "state": "failed",
    "web_url": "https://buildkite.com/my-org/my-pipeline/builds/123#01234567-89ab-cdef-0123-456789abcdef"
  }
]
```

### List Job Spec Failures

```
POST /mcp_buildkite_list_job_spec_failures
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "job_id": "01234567-89ab-cdef-0123-456789abcdef",
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "type": "RSpec",
    "spec": "./spec/path/to/file_spec.rb:123",
    "message": "Expected result to be X but got Y"
  }
]
```

### Get Job Log

```
POST /mcp_buildkite_get_job_log
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "job_id": "01234567-89ab-cdef-0123-456789abcdef",
  "access_token": "optional-if-set-in-env",
  "limit": 100  // optional, defaults to all content
}
```

**Response:**
```json
{
  "content": "...log content...",
  "size": 12345,
  "format": "raw"
}
```

### List Failed Specs from Build URL

```
POST /mcp_buildkite_list_failed_specs
```

**Request Body:**
```json
{
  "build_url": "https://buildkite.com/my-org/my-pipeline/builds/123",
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
{
  "build_url": "https://buildkite.com/my-org/my-pipeline/builds/123",
  "failed_job_count": 2,
  "jobs": [
    {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "Test Job 1",
      "web_url": "https://buildkite.com/my-org/my-pipeline/builds/123#01234567-89ab-cdef-0123-456789abcdef",
      "failures": [
        {
          "spec": "./spec/path/to/file_spec.rb:123",
          "message": "Expected result to be X but got Y"
        }
      ]
    },
    {
      "id": "fedcba98-7654-3210-fedc-ba9876543210",
      "name": "Test Job 2",
      "web_url": "https://buildkite.com/my-org/my-pipeline/builds/123#fedcba98-7654-3210-fedc-ba9876543210",
      "failures": []
    }
  ],
  "failures": [
    {
      "job_id": "01234567-89ab-cdef-0123-456789abcdef",
      "job_name": "Test Job 1",
      "job_url": "https://buildkite.com/my-org/my-pipeline/builds/123#01234567-89ab-cdef-0123-456789abcdef",
      "spec": "./spec/path/to/file_spec.rb:123",
      "message": "Expected result to be X but got Y"
    }
  ]
}
```

### Retry Job

```
POST /mcp_buildkite_retry_job
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "build_number": 123,
  "job_id": "01234567-89ab-cdef-0123-456789abcdef",
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
{
  "id": "job-id",
  "state": "scheduled"
}
```

### List Pipeline Build Failures

```
POST /mcp_buildkite_list_pipeline_build_failures
```

**Request Body:**
```json
{
  "organization": "my-org",
  "pipeline": "my-pipeline",
  "state": "finished",
  "per_page": 10,
  "page": 1,
  "access_token": "optional-if-set-in-env"
}
```

**Response:**
```json
[
  {
    "build_number": 123,
    "build_url": "https://buildkite.com/my-org/my-pipeline/builds/123",
    "failed_jobs": [
      {
        "name": "Test Job",
        "url": "https://buildkite.com/my-org/my-pipeline/builds/123#01234567-89ab-cdef-0123-456789abcdef"
      }
    ]
  }
]
```

## Environment Variables

- `BUILDKITE_ACCESS_TOKEN`: Your Buildkite API token with read access
- `PORT`: (Optional) Port to run the server on (default: 63330)

## Error Handling

The server returns appropriate HTTP status codes and error messages when something goes wrong:

- `400`: Bad Request - Missing or invalid parameters
- `401`: Unauthorized - Invalid or missing access token
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server-side error 