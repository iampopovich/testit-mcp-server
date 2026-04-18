# TestIT MCP

[![npm version](https://img.shields.io/npm/v/testit-mcp-server)](https://www.npmjs.com/package/testit-mcp-server) [![MIT License](https://img.shields.io/npm/l/testit-mcp-server)](https://github.com/iampopovich/testit-mcp-server/blob/main/LICENSE)

Production-ready MCP server for TestIT focused on WorkItems, TestRuns, and TestPlans.

## Features

- Simple API Key authentication via `PrivateToken` or `Bearer` scheme.
- Project-aware tools with optional default project via `TESTIT_PROJECT_ID`.
- Project resolution by `projectId` (UUID) or `projectName`.
- Support for TestIT v2 API.
- `stdio` transport for local MCP clients (`npx` or local build).

## Tool Coverage

- **Projects**: list, search, get, create, update, delete
- **Work Items**: list, search, get, create, update, delete, history, versions, restore, attachments
- **Test Runs**: list, get, create, start, stop, delete, results
- **Test Results**: get, search, create, update
- **Test Plans**: list, get, create, update, delete
- **Shared Steps**: list, get (as specialized work items)
- **Configurations**: list, get, create, update
- **Analytics**: project analytics, test plan analytics, test run analytics

## Authentication

This server uses the TestIT API Key:

1. Use your user-generated API Secret Key in `TESTIT_TOKEN`.
2. Server uses `Authorization: PrivateToken {token}` by default.
3. If token starts with `Bearer `, it uses it as is.

## Environment Variables

```bash
TESTIT_URL=https://testit.instance.com/
TESTIT_TOKEN=your-api-token
# Optional default project (UUID):
# TESTIT_PROJECT_ID=550e8400-e29b-41d4-a716-446655440000
```

- `TESTIT_URL` required
- `TESTIT_TOKEN` required
- `TESTIT_PROJECT_ID` optional

## Run Locally

### Prerequisites

- Node.js v18+ and npm

### Step-by-step

1) Clone the repository:

```bash
git clone https://github.com/iampopovich/testit-mcp-server.git
cd testit-mcp-server
```

2) Install dependencies:

```bash
npm install
```

3) Create your local environment file from the example and fill required values:

```bash
cp .env.example .env
```

4) Build the project:

```bash
npm run build
```

5) Start the MCP server:

```bash
npm start
```

## MCP Client Setup

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://{testit-instance-address}",
        "TESTIT_TOKEN": "{your-api-token}",
        "TESTIT_PROJECT_ID": "{TestIT-project-uuid}"
      }
    }
  }
}
```
