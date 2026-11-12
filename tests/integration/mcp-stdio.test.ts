/**
 * End-to-end over the real MCP stdio transport: spawns the built server
 * (dist/index.js) and talks to it with the SDK client.
 */
import { existsSync, readFileSync } from "node:fs";
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

  it("TESTIT_TOOLSETS limits exposed tools", async () => {
    await withServer({ TESTIT_TOOLSETS: "projects" }, async (client) => {
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((t) => t.name.includes("project"))).toBe(true);
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

  it("reports the package version and turns tool errors into isError results", async () => {
    await withServer({}, async (client) => {
      const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
      expect(client.getServerVersion()).toMatchObject({ name: "testit-mcp-server", version: pkg.version });

      const traversal = await client.callTool({
        name: "get_work_item",
        arguments: { id: `../projects/${getProjectId()}` },
      });
      expect(traversal.isError).toBe(true);
      expect((traversal.content as Array<{ text: string }>)[0].text).toMatch(/^Error: Invalid request path/);

      const missing = await client.callTool({
        name: "get_work_item",
        arguments: { id: "00000000-0000-0000-0000-000000000001" },
      });
      expect(missing.isError).toBe(true);
      expect((missing.content as Array<{ text: string }>)[0].text).toMatch(/failed \(404\).*Hint:/);

      const noArgs = await client.callTool({ name: "get_work_item", arguments: {} });
      expect(noArgs.isError).toBe(true);
      expect((noArgs.content as Array<{ text: string }>)[0].text).toContain('"id" must be');

      const unknown = await client.callTool({ name: "no_such_tool", arguments: {} });
      expect(unknown.isError).toBe(true);
    });
  });

  it("admin and bulk toolsets are opt-in", async () => {
    const names = async (env: Record<string, string>) =>
      withServer(env, async (client) => (await client.listTools()).tools.map((t) => t.name));
    const byDefault = await names({});
    expect(byDefault).not.toContain("search_webhooks");
    expect(byDefault).not.toContain("delete_autotests");
    const withOptIn = await names({ TESTIT_TOOLSETS: "default,admin,bulk" });
    expect(withOptIn).toEqual(expect.arrayContaining(["search_webhooks", "delete_autotests", "get_work_item"]));
    const all = await names({ TESTIT_TOOLSETS: "all" });
    expect(new Set(all)).toEqual(new Set(withOptIn));
  });
});
