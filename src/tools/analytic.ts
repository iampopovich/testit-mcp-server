import type { TestITApiClient } from "../client.js";
import * as api from "../api/analytic.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

export function createAnalyticTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "get_project_analytics",
      description: "Get analytics for all test plans in a project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          page: { type: "number" },
          size: { type: "number" },
        },
      },
    },
    {
      name: "get_test_plan_analytics",
      description: "Get analytics for a specific test plan.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "get_test_run_statistics",
      description: "Get test result statistics for a specific test run, optionally filtered.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test run UUID." },
          filter: {
            type: "object",
            description: "Optional filter body to narrow statistics results.",
            additionalProperties: true,
          },
        },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    get_project_analytics: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.getProjectTestPlansWithAnalytics(client, projectId, pickPagination(args));
    },
    get_test_plan_analytics: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestPlanAnalytics(client, getRequiredId(args) as string);
    },
    get_test_run_statistics: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = (args.filter as Record<string, unknown>) || {};
      return api.getTestRunStatistics(client, getRequiredId(args) as string, filter);
    },
  };

  return { tools, handlers };
}
