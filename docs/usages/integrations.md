# Integration Examples

This page shows MCP config examples for Cursor, Claude Code, and Claude Desktop.

All examples assume these environment values:

```json
{
  "TESTIT_URL": "https://your-TestIT-instance.com",
  "TESTIT_TOKEN": "your-api-token",
  "TESTIT_PROJECT_ID": "37"
}
```

## Cursor

Use this `mcpServers` entry in Cursor MCP settings:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "github:iampopovich/testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-TestIT-instance.com",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "37"
      }
    }
  }
}
```

## Claude Code

Use the same `mcpServers` structure in Claude Code MCP config:

```json
{
  "mcpServers": {
    "testit": {
      "command": "npx",
      "args": ["-y", "github:iampopovich/testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-TestIT-instance.com",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "37"
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
      "args": ["-y", "github:iampopovich/testit-mcp-server"],
      "env": {
        "TESTIT_URL": "https://your-TestIT-instance.com",
        "TESTIT_TOKEN": "your-api-token",
        "TESTIT_PROJECT_ID": "37"
      }
    }
  }
}
```

## Alternate Runtime Commands

If you prefer other runtimes, replace only `command` and `args`:

- Docker: see [docker.md](./docker.md)
- Local build (`node dist/index.js`): see [running-locally.md](./running-locally.md)


