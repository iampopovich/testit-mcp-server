import { TestITApiClient } from "./client.js";
import { createAnalyticTools } from "./tools/analytic.js";
import { createProjectTools } from "./tools/projects.js";
import { createConfigurationTools } from "./tools/configurations.js";
import { createTestRunTools } from "./tools/test-runs.js";
import { createSharedStepTools } from "./tools/shared-steps.js";
import { createWorkItemTools } from "./tools/work-items.js";
import { createSectionTools } from "./tools/sections.js";
import { createTestPlanTools } from "./tools/test-plans.js";
import { createTestSuiteTools } from "./tools/test-suites.js";
import { createAutoTestTools } from "./tools/autotests.js";
import { createDictionaryTools } from "./tools/dictionaries.js";
import { createConfigurationParameterTools } from "./tools/configuration-parameters.js";
import { createAttachmentTools } from "./tools/attachments.js";
import { createCustomAttributeTools } from "./tools/custom-attributes.js";
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
  /** Human-readable category (docs/tools.json). */
  category: string;
  /** Toolset id used by TESTIT_TOOLSETS. */
  toolset: string;
}

export function buildToolBundles(client: TestITApiClient): NamedToolBundle[] {
  return [
    { category: "Projects", toolset: "projects", ...createProjectTools(client) },
    { category: "Work Items", toolset: "work-items", ...createWorkItemTools(client) },
    { category: "Sections", toolset: "sections", ...createSectionTools(client) },
    { category: "Test Runs", toolset: "test-runs", ...createTestRunTools(client) },
    { category: "Test Results", toolset: "test-results", ...createTestResultTools(client) },
    { category: "Test Plans", toolset: "test-plans", ...createTestPlanTools(client) },
    { category: "Test Suites & Points", toolset: "test-suites", ...createTestSuiteTools(client) },
    { category: "Autotests", toolset: "autotests", ...createAutoTestTools(client) },
    { category: "Analytics", toolset: "analytics", ...createAnalyticTools(client) },
    { category: "Shared Steps", toolset: "shared-steps", ...createSharedStepTools(client) },
    { category: "Configurations", toolset: "configurations", ...createConfigurationTools(client) },
    {
      category: "Configuration Parameters",
      toolset: "configuration-parameters",
      ...createConfigurationParameterTools(client),
    },
    { category: "Attachments", toolset: "attachments", ...createAttachmentTools(client) },
    { category: "Dictionaries", toolset: "dictionaries", ...createDictionaryTools(client) },
    { category: "Custom Attributes (admin)", toolset: "admin", ...createCustomAttributeTools(client) },
  ];
}

export interface ToolRegistryOptions {
  /** Expose only tools without side effects (readOnlyHint). */
  readOnly?: boolean;
  /**
   * Toolsets to expose; undefined or empty = "default". Keywords: "default" (every toolset
   * except opt-in ones), "all" (everything).
   */
  toolsets?: string[];
}

/** Admin and bulk tools are hidden unless requested explicitly (TESTIT_TOOLSETS=default,admin). */
export const OPT_IN_TOOLSETS: ReadonlySet<string> = new Set(["admin", "bulk"]);
const TOOLSET_KEYWORDS: ReadonlySet<string> = new Set(["default", "all"]);

/** Bundles with annotations applied — the single source for the server and the catalog. */
export function buildAnnotatedBundles(
  client: TestITApiClient,
  options: ToolRegistryOptions = {},
): NamedToolBundle[] {
  const bundles = buildToolBundles(client);
  const requested = options.toolsets?.length ? new Set(options.toolsets) : new Set(["default"]);
  const known = new Set(bundles.map((bundle) => bundle.toolset));
  const unknown = [...requested].filter((name) => !known.has(name) && !TOOLSET_KEYWORDS.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown toolset(s) in TESTIT_TOOLSETS: ${unknown.join(", ")}. Valid: ${[...known].join(", ")}, ` +
        `or the keywords "default" (all non-opt-in toolsets) and "all".`,
    );
  }
  const isSelected = (bundle: NamedToolBundle) =>
    requested.has("all") ||
    requested.has(bundle.toolset) ||
    (requested.has("default") && !OPT_IN_TOOLSETS.has(bundle.toolset));

  return bundles
    .filter(isSelected)
    .map((bundle) => {
      const tools = bundle.tools
        .map((tool) => ({ ...tool, annotations: annotationsFor(tool.name) }))
        .filter((tool) => !options.readOnly || tool.annotations.readOnlyHint);
      const handlers = Object.fromEntries(tools.map((tool) => [tool.name, bundle.handlers[tool.name]]));
      return { ...bundle, tools, handlers };
    });
}

export function buildToolRegistry(
  client: TestITApiClient,
  options: ToolRegistryOptions = {},
): { tools: McpToolDefinition[]; handlers: Map<string, ToolHandler> } {
  const tools: McpToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();
  for (const bundle of buildAnnotatedBundles(client, options)) {
    tools.push(...bundle.tools);
    for (const [name, handler] of Object.entries(bundle.handlers)) {
      handlers.set(name, handler);
    }
  }

  return { tools, handlers };
}

export function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/** Parses a comma/space separated list env var, e.g. "projects, work-items". */
export function parseListEnv(value: string | undefined): string[] | undefined {
  const items = (value ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}
