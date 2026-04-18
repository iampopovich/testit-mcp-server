import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-plans.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

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
          page: { type: "number" },
          size: { type: "number" },
        },
      },
    },
    {
      name: "get_test_plan",
      description: "Get a test plan by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "create_test_plan",
      description: "Create a new test plan.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "update_test_plan",
      description: "Update an existing test plan (PUT).",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "delete_test_plan",
      description: "Delete a test plan by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Test plan UUID." } },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_test_plans: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listTestPlans(client, projectId, pickPagination(args));
    },
    get_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestPlan(client, getRequiredId(args) as string);
    },
    create_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      if (!payload.projectId && client.defaultProjectId) {
        payload.projectId = client.defaultProjectId;
      }
      return api.createTestPlan(client, payload);
    },
    update_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateTestPlan(client, payload);
    },
    delete_test_plan: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteTestPlan(client, getRequiredId(args) as string);
    },
  };

  return { tools, handlers };
}
