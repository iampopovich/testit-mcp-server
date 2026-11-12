import { TestITApiClient } from "./client.js";
import { createAnalyticTools } from "./tools/analytic.js";
import { createProjectTools } from "./tools/projects.js";
import { createConfigurationTools } from "./tools/configurations.js";
import { createTestRunTools } from "./tools/test-runs.js";
import { createSharedStepTools } from "./tools/shared-steps.js";
import { createWorkItemTools } from "./tools/work-items.js";
import { createTestPlanTools } from "./tools/test-plans.js";
import { createTestResultTools } from "./tools/test-results.js";
import { annotationsFor } from "./tools/annotations.js";
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

export interface ToolRegistryOptions {
  /** Expose only tools without side effects (readOnlyHint). */
  readOnly?: boolean;
}

export function buildToolRegistry(
  client: TestITApiClient,
  options: ToolRegistryOptions = {},
): { tools: McpToolDefinition[]; handlers: Map<string, ToolHandler> } {
  const tools: McpToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();
  for (const bundle of buildToolBundles(client)) {
    for (const tool of bundle.tools) {
      const annotations = annotationsFor(tool.name);
      if (options.readOnly && !annotations.readOnlyHint) {
        continue;
      }
      tools.push({ ...tool, annotations });
      handlers.set(tool.name, bundle.handlers[tool.name]);
    }
  }

  return { tools, handlers };
}

export function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
