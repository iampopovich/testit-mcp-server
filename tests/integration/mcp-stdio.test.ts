/**
 * End-to-end over the real MCP stdio transport: spawns the built server
 * (dist/index.js) and talks to it with the SDK client.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { getProjectId, integrationEnabled } from "./setup.js";

const serverPath = path.resolve("dist/index.js");

async function withServer<T>(env: Record<string, string>, fn: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      PATH: process.env.PATH ?? "",
      TESTIT_URL: process.env.TESTIT_URL as string,
      TESTIT_TOKEN: process.env.TESTIT_TOKEN as string,
      TESTIT_PROJECT_ID: getProjectId(),
      ...env,
    },
    stderr: "ignore",
  });
  const client = new Client({ name: "mcp-it", version: "0.0.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

describe.skipIf(!integrationEnabled || !existsSync(serverPath))("integration: MCP stdio server", () => {
  it("lists annotated tools and calls one", async () => {
    await withServer({}, async (client) => {
      const { tools } = await client.listTools();
      const del = tools.find((t) => t.name === "delete_work_item");
      expect(del?.annotations).toMatchObject({ destructiveHint: true, readOnlyHint: false });

      const result = await client.callTool({ name: "get_project", arguments: { id: getProjectId() } });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text).id).toBe(getProjectId());
    });
  });

  it("TESTIT_READ_ONLY hides mutating tools and rejects calls to them", async () => {
    await withServer({ TESTIT_READ_ONLY: "true" }, async (client) => {
      const { tools } = await client.listTools();
      expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
      const result = await client.callTool({ name: "create_work_item", arguments: { name: "x" } });
      expect(result.isError).toBe(true);
      expect((result.content as Array<{ text: string }>)[0].text).toContain("Unknown tool");
    });
  });
});
