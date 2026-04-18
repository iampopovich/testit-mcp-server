import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-results.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
} from "./utils.js";

export function createTestResultTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "get_test_result",
      description: "Get a test result by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "search_test_results",
      description: "Search test results.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "object" },
          page: { type: "number" },
          size: { type: "number" },
        },
        required: ["query"],
      },
    },
    {
      name: "update_test_result",
      description: "Update an existing test result by ID (PUT). In TestIT, test results are pre-created per test point when a test run starts — use this to set outcome, comment, and other fields.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test result UUID." },
          payload: { type: "object", additionalProperties: true },
        },
        required: ["id", "payload"],
      },
    },
  ];

  const handlers = {
    get_test_result: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestResult(client, getRequiredId(args) as string);
    },
    search_test_results: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const query = (args.query as Record<string, unknown>) || {};
      return api.searchTestResults(client, query, pickPagination(args));
    },
    update_test_result: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredId(args) as string;
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateTestResult(client, id, payload);
    },
  };

  return { tools, handlers };
}
