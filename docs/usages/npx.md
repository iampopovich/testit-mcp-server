# Usage via NPX

Use this option when you want zero local build setup and prefer starting the server directly with `npx`.

## Environment Variables

```bash
TESTIT_URL=https://your-testit-instance
TESTIT_TOKEN=your-api-token
# Optional:
# TESTIT_PROJECT_ID=your-project-uuid
# TESTIT_READ_ONLY=true
# TESTIT_TOOLSETS=default,admin
```

## MCP Server Command

From npm:

```json
{
  "command": "npx",
  "args": ["-y", "testit-mcp-server"],
  "env": {
    "TESTIT_URL": "https://your-testit-instance",
    "TESTIT_TOKEN": "your-api-token",
    "TESTIT_PROJECT_ID": "your-project-uuid"
  }
}
```

Alternative: run the latest source from GitHub (built on install by the `prepare` script):

```json
{
  "command": "npx",
  "args": ["-y", "github:iampopovich/testit-mcp-server"],
  "env": {
    "TESTIT_URL": "https://your-testit-instance",
    "TESTIT_TOKEN": "your-api-token",
    "TESTIT_PROJECT_ID": "your-project-uuid"
  }
}
```

## Notes

- `TESTIT_TOKEN` is the private API token from your Test IT profile.
- `TESTIT_PROJECT_ID` (project UUID) is optional; otherwise provide `projectId` or `projectName` in project-scoped tools.
- `TESTIT_READ_ONLY=true` exposes only list/get/search tools; `TESTIT_TOOLSETS` selects toolsets (`admin` and `bulk` are opt-in).
