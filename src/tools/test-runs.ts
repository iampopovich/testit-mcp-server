import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-runs.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredId,
  PAGINATION_PROPERTIES,
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
          notStarted: { type: "boolean", description: "Include NotStarted runs." },
          inProgress: { type: "boolean", description: "Include InProgress runs." },
          stopped: { type: "boolean", description: "Include Stopped runs." },
          completed: { type: "boolean", description: "Include Completed runs." },
          testPlanId: { type: "string", description: "Only runs of this test plan." },
          createdDateFrom: { type: "string", description: "ISO date-time." },
          createdDateTo: { type: "string", description: "ISO date-time." },
          ...PAGINATION_PROPERTIES,
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
      description:
        "Create an empty test run in a project (state NotStarted). Extra CreateEmptyTestRunApiModel " +
        "fields (attachments, links) can be passed in \"payload\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string", description: "Project name (alternative to projectId)." },
          name: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          launchSource: { type: "string", description: "Free-form launch source, e.g. CI job URL." },
          payload: { type: "object", additionalProperties: true },
        },
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
      name: "complete_test_run",
      description: "Complete a test run (InProgress/Stopped -> Completed).",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Test run UUID." } },
        required: ["id"],
      },
    },
    {
      name: "delete_test_run",
      description: "Delete (archive) a test run by ID. Use restore_test_run to undo or purge_test_run to remove permanently.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Test run UUID." } },
        required: ["id"],
      },
    },
    {
      name: "restore_test_run",
      description: "Restore an archived (deleted) test run.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Test run UUID." } },
        required: ["id"],
      },
    },
    {
      name: "purge_test_run",
      description: "Permanently delete an archived test run. Irreversible; delete (archive) it first.",
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
          id: { type: "string", description: "Test run UUID." },
        },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_test_runs: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listTestRuns(client, projectId, {
        notStarted: getOptionalBoolean(args, "notStarted"),
        inProgress: getOptionalBoolean(args, "inProgress"),
        stopped: getOptionalBoolean(args, "stopped"),
        completed: getOptionalBoolean(args, "completed"),
        testPlanId: getOptionalString(args, "testPlanId"),
        createdDateFrom: getOptionalString(args, "createdDateFrom"),
        createdDateTo: getOptionalString(args, "createdDateTo"),
        ...pickPagination(args),
      });
    },
    get_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestRun(client, getRequiredId(args) as string);
    },
    create_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = { ...(getOptionalObjectPayload(args, "payload") ?? {}) };
      const typed = {
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
        tags: getOptionalStringArray(args, "tags"),
        launchSource: getOptionalString(args, "launchSource"),
      };
      for (const [key, value] of Object.entries(typed)) {
        if (value !== undefined) body[key] = value;
      }
      if (typeof args.projectId === "string" || typeof args.projectName === "string" || !body.projectId) {
        body.projectId = await resolveProjectId(args, client);
      }
      return api.createTestRun(client, body);
    },
    complete_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.completeTestRun(client, getRequiredId(args) as string);
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
    restore_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.restoreTestRun(client, getRequiredId(args) as string);
    },
    purge_test_run: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.purgeTestRun(client, getRequiredId(args) as string);
    },
    get_test_run_results: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestRunTestResults(client, getRequiredId(args) as string, {});
    },
  };

  return { tools, handlers };
}
