import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-plans.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getObjectPayload,
  getRequiredId,
  getOptionalBoolean,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  type ToolArgs,
} from "./utils.js";

const STATE_ACTIONS = ["start", "pause", "complete"] as const;

const TEST_POINT_IDS = {
  type: "array",
  items: { type: "string" },
  description: "Test point UUIDs (see list_test_suite_test_points / search_test_points). Must not be empty.",
} as const;

/**
 * TestIT applies tester/selection endpoints to ALL points of the plan when the
 * selection is empty (verified live), so an explicit non-empty list is required.
 */
function requirePointIds(args: ToolArgs): string[] {
  const ids = getOptionalStringArray(args, "testPointIds");
  if (!ids || ids.length === 0) {
    throw new Error('"testPointIds" must be a non-empty array of test point UUIDs.');
  }
  return ids;
}

const idOnly = (description: string) => ({
  type: "object" as const,
  properties: { id: { type: "string", description } },
  required: ["id"],
});

export function createTestPlanTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_test_plans",
      description: "List test plans for a project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          isDeleted: { type: "boolean", description: "Return archived (deleted) test plans." },
        },
      },
    },
    {
      name: "get_test_plan",
      description: "Get a test plan by ID.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "create_test_plan",
      description:
        "Create a test plan (status New). Extra CreateTestPlanApiModel fields can be passed in \"payload\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          build: { type: "string" },
          productName: { type: "string" },
          startDate: { type: "string", description: "ISO date-time." },
          endDate: { type: "string", description: "ISO date-time." },
          tags: { type: "array", items: { type: "string" }, description: "Tag names." },
          attributes: { type: "object", additionalProperties: true },
          payload: { type: "object", additionalProperties: true },
        },
        required: ["name"],
      },
    },
    {
      name: "update_test_plan",
      description:
        "Replace a test plan (PUT). Requires id, name, projectId in payload; fields not sent are cleared.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "set_test_plan_state",
      description: "Change test plan status: start (-> InProgress), pause (-> Paused), complete (-> Completed).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          action: { type: "string", enum: [...STATE_ACTIONS] },
        },
        required: ["id", "action"],
      },
    },
    {
      name: "create_test_plan_clone",
      description: "Clone a test plan (copy named \"<name> (1)\", status New). Returns the new plan.",
      inputSchema: idOnly("Source test plan UUID."),
    },
    {
      name: "list_test_plan_test_runs",
      description: "List test runs of a test plan, optionally filtered by state.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          notStarted: { type: "boolean" },
          inProgress: { type: "boolean" },
          stopped: { type: "boolean" },
          completed: { type: "boolean" },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
    {
      name: "delete_test_plan",
      description: "Delete (archive) a test plan. Use restore_test_plan to undo or purge_test_plan to remove it for good.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "restore_test_plan",
      description: "Restore an archived (deleted) test plan.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "purge_test_plan",
      description: "Permanently delete an archived test plan. Irreversible; delete (archive) it first.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "assign_test_points_tester",
      description:
        "Assign a tester (user UUID) to the given test points of a test plan. TestIT has no user list API: " +
        "take user ids from existing entities (createdById, testerId). Returns the affected point ids.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          userId: { type: "string", description: "Tester user UUID." },
          testPointIds: TEST_POINT_IDS,
        },
        required: ["id", "userId", "testPointIds"],
      },
    },
    {
      name: "unassign_test_points_tester",
      description: "Remove the tester from the given test points of a test plan. Returns the affected point ids.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          testPointIds: TEST_POINT_IDS,
        },
        required: ["id", "testPointIds"],
      },
    },
    {
      name: "reset_test_points",
      description: "Reset the given test points of a test plan back to NoResults (their results are discarded).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          testPointIds: TEST_POINT_IDS,
        },
        required: ["id", "testPointIds"],
      },
    },
    {
      name: "get_test_plan_summary",
      description:
        "Test plan totals: test points (total/manual/automated/completed), defects, planned and spent duration.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "list_test_plan_configurations",
      description: "Configurations used by the test points of a test plan.",
      inputSchema: idOnly("Test plan UUID."),
    },
    {
      name: "get_test_plan_history",
      description: "Change history of a test plan.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test plan UUID." },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_test_plans: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listTestPlans(client, projectId, {
        isDeleted: getOptionalBoolean(args, "isDeleted"),
      });
    },
    get_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestPlan(client, getRequiredId(args) as string);
    },
    create_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = { ...(getOptionalObjectPayload(args, "payload") ?? {}) };
      const typed: Record<string, unknown> = {
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
        build: getOptionalString(args, "build"),
        productName: getOptionalString(args, "productName"),
        startDate: getOptionalString(args, "startDate"),
        endDate: getOptionalString(args, "endDate"),
        tags: getOptionalStringArray(args, "tags")?.map((name) => ({ name })),
        attributes: getOptionalObjectPayload(args, "attributes"),
      };
      for (const [key, value] of Object.entries(typed)) {
        if (value !== undefined) body[key] = value;
      }
      if (!body.name) {
        throw new Error("\"name\" is required.");
      }
      if (typeof args.projectId === "string" || typeof args.projectName === "string" || !body.projectId) {
        body.projectId = await resolveProjectId(args, client);
      }
      return api.createTestPlan(client, body);
    },
    update_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = getObjectPayload(args);
      return api.updateTestPlan(client, payload);
    },
    set_test_plan_state: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const action = getRequiredString(args, "action");
      if (!(STATE_ACTIONS as readonly string[]).includes(action)) {
        throw new Error(`"action" must be one of: ${STATE_ACTIONS.join(", ")}.`);
      }
      return api.changeTestPlanState(client, getRequiredString(args, "id"), action as api.TestPlanStateAction);
    },
    create_test_plan_clone: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.cloneTestPlan(client, getRequiredString(args, "id"));
    },
    list_test_plan_test_runs: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listTestPlanTestRuns(client, getRequiredString(args, "id"), {
        notStarted: getOptionalBoolean(args, "notStarted"),
        inProgress: getOptionalBoolean(args, "inProgress"),
        stopped: getOptionalBoolean(args, "stopped"),
        completed: getOptionalBoolean(args, "completed"),
        ...pickPagination(args),
      });
    },
    delete_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteTestPlan(client, getRequiredId(args) as string);
    },
    restore_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.restoreTestPlan(client, getRequiredString(args, "id"));
    },
    purge_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.purgeTestPlan(client, getRequiredString(args, "id"));
    },
    assign_test_points_tester: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.assignTestPointsTester(
        client,
        getRequiredString(args, "id"),
        getRequiredString(args, "userId"),
        requirePointIds(args),
      );
    },
    unassign_test_points_tester: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.unassignTestPointsTester(client, getRequiredString(args, "id"), requirePointIds(args));
    },
    reset_test_points: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.resetTestPoints(client, getRequiredString(args, "id"), requirePointIds(args));
    },
    get_test_plan_summary: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestPlanSummary(client, getRequiredString(args, "id"));
    },
    list_test_plan_configurations: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listTestPlanConfigurations(client, getRequiredString(args, "id"));
    },
    get_test_plan_history: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestPlanHistory(client, getRequiredString(args, "id"), pickPagination(args));
    },
  };

  return { tools, handlers };
}
