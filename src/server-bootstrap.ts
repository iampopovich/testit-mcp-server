import { TestITApiClient } from "./client.js";
import { createAnalyticTools } from "./tools/analytic.js";
import { createProjectTools } from "./tools/projects.js";
import { createConfigurationTools } from "./tools/configurations.js";
import { createTestRunTools } from "./tools/test-runs.js";
import { createSharedStepTools } from "./tools/shared-steps.js";
import { createWorkItemTools } from "./tools/work-items.js";
import { createTestPlanTools } from "./tools/test-plans.js";
import { createTestResultTools } from "./tools/test-results.js";
import { McpToolDefinition, ToolBundle, ToolHandler } from "./tools/types.js";

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface NamedToolBundle extends ToolBundle {
  category: string;
}

export function buildToolBundles(client: TestITApiClient): NamedToolBundle[] {
  return [
    { category: "Projects", ...createProjectTools(client) },
    { category: "Work Items", ...createWorkItemTools(client) },
    { category: "Test Runs", ...createTestRunTools(client) },
    { category: "Test Results", ...createTestResultTools(client) },
    { category: "Test Plans", ...createTestPlanTools(client) },
    { category: "Analytics", ...createAnalyticTools(client) },
    { category: "Shared Steps", ...createSharedStepTools(client) },
    { category: "Configurations", ...createConfigurationTools(client) },
  ];
}

export function buildToolRegistry(
  client: TestITApiClient,
): { tools: McpToolDefinition[]; handlers: Map<string, ToolHandler> } {
  const tools: McpToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();
  for (const bundle of buildToolBundles(client)) {
    tools.push(...bundle.tools);
    for (const [name, handler] of Object.entries(bundle.handlers)) {
      handlers.set(name, handler);
    }
  }

  return { tools, handlers };
}
