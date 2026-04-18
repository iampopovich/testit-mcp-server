#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TokenManager } from "./auth.js";
import { TestITApiClient } from "./client.js";
import { buildToolRegistry, requiredEnv } from "./server-bootstrap.js";

function formatToolResult(result: unknown): string {
  if (result === undefined) {
    return "OK";
  }
  if (typeof result === "string") {
    return result;
  }
  return JSON.stringify(result, null, 2);
}

function parseOptionalProjectId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value;
}

async function main(): Promise<void> {
  const baseUrl = requiredEnv("TESTIT_URL");
  const apiToken = requiredEnv("TESTIT_TOKEN");
  const defaultProjectId = parseOptionalProjectId(process.env.TESTIT_PROJECT_ID);

  const tokenManager = new TokenManager({ baseUrl, apiToken });
  const client = new TestITApiClient({ baseUrl, tokenManager, defaultProjectId });
  const { tools, handlers } = buildToolRegistry(client);

  const server = new Server(
    { name: "testit-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const toolName = request.params.name;
      const handler = handlers.get(toolName);
      if (!handler) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Unknown tool: ${toolName}`,
            },
          ],
        };
      }

      const result = await handler(request.params.arguments);
      return {
        content: [
          {
            type: "text",
            text: formatToolResult(result),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TestIT MCP server started.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal startup error: ${message}`);
  process.exit(1);
});


