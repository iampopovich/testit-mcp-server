import type { TestITApiClient } from "../client.js";
import * as api from "../api/shared-steps.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

export function createSharedStepTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_shared_steps",
      description: "List shared steps for a project.",
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
      name: "get_shared_step",
      description: "Get a shared step by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_shared_steps: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listSharedSteps(client, projectId, pickPagination(args));
    },
    get_shared_step: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getSharedStep(client, getRequiredId(args) as string);
    },
  };

  return { tools, handlers };
}
