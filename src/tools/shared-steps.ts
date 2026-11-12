import type { TestITApiClient } from "../client.js";
import * as api from "../api/shared-steps.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  buildWorkItemFilter,
  getRequiredId,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  WORK_ITEM_FILTER_PROPERTIES,
} from "./utils.js";

const SHARED_STEP_FILTER_PROPERTIES = Object.fromEntries(
  Object.entries(WORK_ITEM_FILTER_PROPERTIES).filter(([key]) => key !== "types"),
);

export function createSharedStepTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_shared_steps",
      description: "List shared steps of a project, with optional filters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          ...SHARED_STEP_FILTER_PROPERTIES,
          ...PAGINATION_PROPERTIES,
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
      const filter = buildWorkItemFilter(args);
      delete filter.types;
      return api.listSharedSteps(client, projectId, filter, pickPagination(args));
    },
    get_shared_step: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredId(args) as string;
      const item = (await api.getSharedStep(client, id)) as { entityTypeName?: string } | undefined;
      if (item?.entityTypeName && item.entityTypeName !== "SharedSteps") {
        throw new Error(
          `Work item ${id} is a ${item.entityTypeName} item, not a shared step. Use get_work_item for it.`,
        );
      }
      return item;
    },
  };

  return { tools, handlers };
}
