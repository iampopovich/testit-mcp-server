import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-runs.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

export function createTestRunTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_test_runs",
      description: "List test runs for a project.",
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
      name: "get_test_run",
      description: "Get a test run by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "create_test_run",
      description: "Create a new test run.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "start_test_run",
      description: "Start a test run.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "stop_test_run",
      description: "Stop a test run.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "delete_test_run",
      description: "Delete a test run by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Test run UUID." } },
        required: ["id"],
      },
    },
    {
      name: "get_test_run_results",
      description: "Get test results for a test run.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string" },
          page: { type: "number" },
          size: { type: "number" },
        },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_test_runs: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listTestRuns(client, projectId, pickPagination(args));
    },
    get_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestRun(client, getRequiredId(args) as string);
    },
    create_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      if (!payload.projectId && client.defaultProjectId) {
        payload.projectId = client.defaultProjectId;
      }
      return api.createTestRun(client, payload);
    },
    start_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.startTestRun(client, getRequiredId(args) as string);
    },
    stop_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.stopTestRun(client, getRequiredId(args) as string);
    },
    delete_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteTestRun(client, getRequiredId(args) as string);
    },
    get_test_run_results: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestRunTestResults(client, getRequiredId(args) as string, pickPagination(args));
    },
  };

  return { tools, handlers };
}
