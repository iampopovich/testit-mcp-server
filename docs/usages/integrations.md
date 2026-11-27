# Integration Examples

This page shows MCP config examples for Cursor, Claude Code, and Claude Desktop.

All examples assume these environment values:

```json
{
  "TESTIT_URL": "https://your-testit-instance",
  "TESTIT_TOKEN": "your-api-token",
  "TESTIT_PROJECT_ID": "your-project-uuid"
}
```

`TESTIT_PROJECT_ID` is optional. `TESTIT_READ_ONLY` and `TESTIT_TOOLSETS` can be added to `env` the same way.

## Cursor

Use this `mcpServers` entry in Cursor MCP settings:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-testit-instance",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "your-project-uuid"
      }
    }
  }
}
```

## Claude Code

Add the server from the command line:

```bash
claude mcp add testit \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-api-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  -- npx -y testit-mcp-server
```

Or use the same `mcpServers` structure in a project `.mcp.json`:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-testit-instance",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "your-project-uuid"
      }
    }
  }
}
```

## Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-testit-instance",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "your-project-uuid"
      }
    }
  }
}
```

## Alternate Runtime Commands

If you prefer other runtimes, replace only `command` and `args`:

- Docker (locally built image): see [docker.md](./docker.md)
- Local build (`node dist/index.js`): see [running-locally.md](./running-locally.md)
