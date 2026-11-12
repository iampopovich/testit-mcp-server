import { TokenManager } from "../../src/auth.js";
import { TestITApiClient } from "../../src/client.js";
import { buildToolRegistry } from "../../src/server-bootstrap.js";
import type { ToolHandler } from "../../src/tools/types.js";

type ToolArgs = Record<string, unknown>;

interface IntegrationContext {
  projectId: string;
  client: TestITApiClient;
  handlers: Map<string, ToolHandler>;
}

const requiredEnvNames = ["TESTIT_URL", "TESTIT_TOKEN", "TESTIT_PROJECT_ID"] as const;

function getMissingRequiredEnv(): string[] {
  return requiredEnvNames.filter((name) => {
    const value = process.env[name];
    return !value || value.trim().length === 0;
  });
}

/** Integration tests run only when TESTIT_URL, TESTIT_TOKEN and TESTIT_PROJECT_ID are set. */
export const integrationEnabled = getMissingRequiredEnv().length === 0;

let cachedContext: IntegrationContext | null = null;

function getContext(): IntegrationContext {
  if (cachedContext) {
    return cachedContext;
  }
  const missing = getMissingRequiredEnv();
  if (missing.length > 0) {
    throw new Error(`Missing required env vars for integration tests: ${missing.join(", ")}`);
  }
  const baseUrl = process.env.TESTIT_URL as string;
  const apiToken = process.env.TESTIT_TOKEN as string;
  const projectId = process.env.TESTIT_PROJECT_ID as string;

  const tokenManager = new TokenManager({ baseUrl, apiToken });
  const client = new TestITApiClient({ baseUrl, tokenManager, defaultProjectId: projectId });
  const { handlers } = buildToolRegistry(client, { toolsets: ["all"] });
  cachedContext = { projectId, client, handlers };
  return cachedContext;
}

export function getProjectId(): string {
  return getContext().projectId;
}

export function getClient(): TestITApiClient {
  return getContext().client;
}

export async function callTool<T = unknown>(name: string, args: ToolArgs = {}): Promise<T> {
  const handler = getContext().handlers.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return (await handler(args)) as T;
}

/** Best-effort call used for cleanup; never throws. */
export async function callSafe(name: string, args: ToolArgs = {}): Promise<void> {
  try {
    await callTool(name, args);
  } catch {
    // ignore
  }
}

export function uniqueName(prefix: string): string {
  return `mcp-it-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * The project's default configuration. Test files run in parallel and some create
 * temporary configurations, so never take "the first one" from the list.
 */
export async function getDefaultConfigurationId(): Promise<string> {
  const configurations = await callTool<Array<{ id: string; isDefault: boolean }>>("list_configurations", {});
  const found = configurations.find((c) => c.isDefault);
  if (!found) {
    throw new Error("Project has no default configuration.");
  }
  return found.id;
}

/** Cleanup helpers: archive then purge so test data does not pile up in the archive. */
export async function removeWorkItem(id: string | undefined): Promise<void> {
  if (!id) return;
  await callSafe("delete_work_item", { id });
  await callSafe("purge_work_item", { id });
}

export async function removeTestRun(id: string | undefined): Promise<void> {
  if (!id) return;
  await callSafe("delete_test_run", { id });
  await callSafe("purge_test_run", { id });
}
