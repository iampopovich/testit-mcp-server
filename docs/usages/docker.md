# Usage via Docker

Use this option when you want an isolated runtime and no local Node.js dependency for execution.

No prebuilt image is published. Build it from a checkout of this repository first:

```bash
git clone https://github.com/iampopovich/testit-mcp-server.git
cd testit-mcp-server
docker build -t testit-mcp-server .
```

## Run the Image with MCP stdio

```bash
docker run -i --rm \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-api-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  testit-mcp-server
```

## MCP Server Command (Docker)

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e",
    "TESTIT_URL",
    "-e",
    "TESTIT_TOKEN",
    "-e",
    "TESTIT_PROJECT_ID",
    "testit-mcp-server"
  ],
  "env": {
    "TESTIT_URL": "https://your-testit-instance",
    "TESTIT_TOKEN": "your-api-token",
    "TESTIT_PROJECT_ID": "your-project-uuid"
  }
}
```

`-e NAME` without a value passes the variable through from `env`, so the token does not appear in the process arguments.

## Notes

- Keep the `-i` flag; MCP stdio requires interactive stdin.
- If you do not set `TESTIT_PROJECT_ID`, pass `projectId` (UUID) or `projectName` to project-scoped tools.
- Optional: `TESTIT_READ_ONLY=true` and `TESTIT_TOOLSETS=default,admin` work the same way as with other runtimes (add more `-e` flags).
- For advanced Docker operations (compose, troubleshooting), see [`DOCKER.md`](../../DOCKER.md).
