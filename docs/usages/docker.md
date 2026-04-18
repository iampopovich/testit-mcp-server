# Usage via Docker

Use this option when you want an isolated runtime and no local Node.js dependency for execution.

## Run the Image with MCP stdio

```bash
docker run -i --rm \
  -e TESTIT_URL=https://your-TestIT-instance.com \
  -e TESTIT_TOKEN=your-api-token \
  -e TESTIT_PROJECT_ID=37 \
  iampopovich/testit-mcp-server:latest
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
    "TESTIT_URL=https://your-TestIT-instance.com",
    "-e",
    "TESTIT_TOKEN=your-api-token",
    "-e",
    "TESTIT_PROJECT_ID=37",
    "iampopovich/testit-mcp-server:latest"
  ]
}
```

## Notes

- Keep the `-i` flag; MCP stdio requires interactive stdin.
- If you do not set `TESTIT_PROJECT_ID`, pass `projectId` or `projectName` to project-scoped tools.
- For advanced Docker operations (build/publish/troubleshooting), see [`DOCKER.md`](../../DOCKER.md).


