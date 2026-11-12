import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-plans.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  getOptionalBoolean,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

const STATE_ACTIONS = ["start", "pause", "complete"] as const;

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
      const payload = (args.payload as Record<string, unknown>) || {};
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
  };

  return { tools, handlers };
}
