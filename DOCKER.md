# Docker Deployment Guide for Test IT MCP Server

This guide explains how to build and run the Test IT MCP server as a Docker container.

No prebuilt image is published to a registry. Build the image locally from this repository; every command below uses the local image name `testit-mcp-server`.

## Prerequisites

- Docker installed (Docker Desktop or Docker Engine)
- A checkout of this repository
- Test IT instance with API access
- Private API token from your Test IT profile

## Building the Docker Image

The Dockerfile uses a multi-stage build process to create an optimized production image:
- **Build stage**: Compiles TypeScript code
- **Production stage**: Contains only runtime dependencies and compiled code

### Build Locally

```bash
docker build -t testit-mcp-server .
```

### Build with Version Tag

```bash
docker build -t testit-mcp-server:0.2.0 -t testit-mcp-server .
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TESTIT_URL` | yes | Base URL of your Test IT instance, e.g. `https://your-testit-instance`. |
| `TESTIT_TOKEN` | yes | Test IT private API token. |
| `TESTIT_PROJECT_ID` | no | Default project UUID. Without it, project-scoped tools take `projectId` or `projectName`. |
| `TESTIT_READ_ONLY` | no | `true` exposes only list/get/search tools. |
| `TESTIT_TOOLSETS` | no | Comma-separated toolsets, e.g. `default,admin`. |

## Running the Container

### Using Docker Run

#### Basic Usage

```bash
docker run -i --rm \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-api-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  testit-mcp-server
```

#### Run in Background

```bash
docker run -d --name testit-mcp -i \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-api-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  --restart unless-stopped \
  testit-mcp-server
```

### Using Docker Compose

The `docker-compose.yml` in the repository builds the image from the local Dockerfile (`build: .`). A minimal service definition looks like this:

```yaml
services:
  testit-mcp-server:
    build: .
    image: testit-mcp-server
    container_name: testit-mcp-server
    environment:
      - TESTIT_URL=${TESTIT_URL}
      - TESTIT_TOKEN=${TESTIT_TOKEN}
      - TESTIT_PROJECT_ID=${TESTIT_PROJECT_ID}
    restart: unless-stopped
    stdin_open: true
```

Create a `.env` file in the same directory:

```bash
TESTIT_URL=https://your-testit-instance
TESTIT_TOKEN=your-api-token-here
TESTIT_PROJECT_ID=your-project-uuid
```

Build and run with Docker Compose:

```bash
docker compose up -d --build
```

## Configuring MCP Clients

### Claude Desktop (Docker Container)

Add to your MCP client configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "testit": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "TESTIT_URL=https://your-testit-instance",
        "-e",
        "TESTIT_TOKEN=your-api-token",
        "-e",
        "TESTIT_PROJECT_ID=your-project-uuid",
        "testit-mcp-server"
      ]
    }
  }
}
```

### Using Environment Variables from Host

If you prefer to keep credentials in a `.env` file on the host:

```json
{
  "mcpServers": {
    "testit": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--env-file",
        "/path/to/your/.env",
        "testit-mcp-server"
      ]
    }
  }
}
```

Create `.env` file with:

```bash
TESTIT_URL=https://your-testit-instance
TESTIT_TOKEN=your-api-token-here
TESTIT_PROJECT_ID=your-project-uuid
```

### Using Docker Compose Service

If running as a Docker Compose service, you can connect to it directly:

```json
{
  "mcpServers": {
    "testit": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "testit-mcp-server",
        "node",
        "dist/index.js"
      ]
    }
  }
}
```

Note: The container must be running before starting the MCP client.

## Verifying the Image

### Test the Container

```bash
# Run interactively
docker run -i --rm \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  testit-mcp-server
```

You should see on stderr:
```
TestIT MCP server started.
```

### Check Image Size

```bash
docker images testit-mcp-server
```

### Inspect Image Layers

```bash
docker history testit-mcp-server
```

## Troubleshooting

### Container Exits Immediately

Make sure to use the `-i` flag (interactive mode) as the MCP server uses stdio for communication.

### `Unable to find image 'testit-mcp-server:latest' locally`

The image is not on any registry. Run `docker build -t testit-mcp-server .` in the repository first.

### Authentication Errors

Verify your environment variables:
```bash
docker run --rm \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  testit-mcp-server \
  node -e "console.log(process.env.TESTIT_URL)"
```

### View Container Logs

```bash
docker logs testit-mcp-server
```

### Interactive Shell for Debugging

```bash
docker run -it --rm \
  -e TESTIT_URL=https://your-testit-instance \
  -e TESTIT_TOKEN=your-token \
  -e TESTIT_PROJECT_ID=your-project-uuid \
  testit-mcp-server \
  sh
```

## Security Best Practices

1. **Never commit credentials**: Keep `.env` files in `.gitignore`
2. **Use secrets management**: For production, use Docker secrets or vault solutions
3. **Scan images**: Regularly scan for vulnerabilities
   ```bash
   docker scout cves testit-mcp-server
   ```
4. **Keep images updated**: Rebuild regularly to get security updates of the `node:20-alpine` base
5. **Use specific tags**: Tag builds with the version (`testit-mcp-server:0.2.0`) instead of relying on `:latest`

## Updating the Image

When you pull new code or make changes:

```bash
git pull
docker build -t testit-mcp-server:0.2.1 -t testit-mcp-server .
```

## Building for Another Architecture (Optional)

To build for a different platform (for example arm64 on an amd64 host) and load it into the local image store:

```bash
docker buildx build --platform linux/arm64 -t testit-mcp-server --load .
```

## Using the Image on Several Machines

There is no registry image to pull, so either build on each machine or move the image:

```bash
# On the build machine
docker save testit-mcp-server | gzip > testit-mcp-server.tar.gz

# On the target machine
docker load < testit-mcp-server.tar.gz
```

If you push the image to your own private registry, replace `testit-mcp-server` in the commands above with your registry path.

## Support

For issues or questions:
- Check the main README.md for usage details
- Review Docker logs: `docker logs testit-mcp-server`
- Verify environment variables are set correctly
- Ensure the Test IT instance is accessible from the container
