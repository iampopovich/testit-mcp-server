import { TestITApiClient } from "./client.js";
import { createAnalyticTools } from "./tools/analytic.js";
import { createProjectTools } from "./tools/projects.js";
import { createConfigurationTools } from "./tools/configurations.js";
import { createTestRunTools } from "./tools/test-runs.js";
import { createSharedStepTools } from "./tools/shared-steps.js";
import { createWorkItemTools } from "./tools/work-items.js";
import { createTestPlanTools } from "./tools/test-plans.js";
import { createTestResultTools } from "./tools/test-results.js";
import { McpToolDefinition, ToolHandler } from "./tools/types.js";

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildToolRegistry(
  client: TestITApiClient,
): { tools: McpToolDefinition[]; handlers: Map<string, ToolHandler> } {
  const bundles = [
    createProjectTools(client),
    createWorkItemTools(client),
    createTestRunTools(client),
    createTestResultTools(client),
    createTestPlanTools(client),
    createAnalyticTools(client),
    createSharedStepTools(client),
    createConfigurationTools(client),
  ];

  const tools: McpToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();
  for (const bundle of bundles) {
    tools.push(...bundle.tools);
    for (const [name, handler] of Object.entries(bundle.handlers)) {
      handlers.set(name, handler);
    }
  }

  return { tools, handlers };
}
