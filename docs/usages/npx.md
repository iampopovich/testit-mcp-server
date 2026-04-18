# Usage via NPX

Use this option when you want zero local build setup and prefer launching the server directly with `npx`.

## Required Environment Variables

```bash
TESTIT_URL=https://your-TestIT-instance.com
TESTIT_TOKEN=your-api-token
# Optional:
# TESTIT_PROJECT_ID=37
```

## MCP Server Command

Preferred for direct GitHub source execution:

```json
{
  "command": "npx",
  "args": ["-y", "github:iampopovich/testit-mcp-server"],
  "env": {
    "TESTIT_URL": "https://your-TestIT-instance.com",
    "TESTIT_TOKEN": "your-api-token",
    "TESTIT_PROJECT_ID": "37"
  }
}
```

Alternative (when the package is published to npm):

```json
{
  "command": "npx",
  "args": ["-y", "testit-mcp-server"],
  "env": {
    "TESTIT_URL": "https://your-TestIT-instance.com",
    "TESTIT_TOKEN": "your-api-token",
    "TESTIT_PROJECT_ID": "37"
  }
}
```

## Notes

- Keep `TESTIT_TOKEN` as a user-generated API token.
- `TESTIT_PROJECT_ID` is optional; otherwise provide `projectId` or `projectName` in project-scoped tools.


