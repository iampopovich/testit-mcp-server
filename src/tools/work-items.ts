import type { TestITApiClient } from "../client.js";
import * as api from "../api/work-items.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  buildWorkItemFilter,
  getRequiredString,
  getRequiredId,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  WORK_ITEM_FILTER_PROPERTIES,
} from "./utils.js";

export function createWorkItemTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_work_items",
      description:
        "List work items (test cases, checklists, shared steps) of a project, with optional filters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID." },
          projectName: {
            type: "string",
            description: "Project name (alternative to projectId).",
          },
          ...WORK_ITEM_FILTER_PROPERTIES,
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "search_work_items",
      description: "Search work items by TQL query.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "object",
            description: "Search filter object according to TestIT API.",
          },
          ...PAGINATION_PROPERTIES,
        },
        required: ["query"],
      },
    },
    {
      name: "get_work_item",
      description: "Get a work item by ID (UUID).",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "create_work_item",
      description: "Create a new work item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "update_work_item",
      description: "Update an existing work item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "delete_work_item",
      description: "Delete a work item by ID (UUID).",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "get_work_item_history",
      description: "Get work item history.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
    {
      name: "get_work_item_versions",
      description: "Get all versions of a work item.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "restore_work_item",
      description: "Restore a deleted work item by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "upload_work_item_attachment",
      description: "Upload an attachment to a work item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          filename: { type: "string", description: "File name including extension." },
          contentType: { type: "string", description: "MIME type, e.g. image/png." },
          contentBase64: { type: "string", description: "File content encoded as base64." },
        },
        required: ["id", "filename", "contentType", "contentBase64"],
      },
    },
  ];

  const handlers = {
    list_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.searchProjectWorkItems(
        client,
        String(projectId),
        buildWorkItemFilter(args),
        pickPagination(args),
      );
    },
    search_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const query = (args.query as Record<string, unknown>) || {};
      return api.searchWorkItems(client, query, pickPagination(args));
    },
    get_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItem(client, getRequiredId(args) as string);
    },
    create_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      if (!payload.projectId && client.defaultProjectId) {
        payload.projectId = client.defaultProjectId;
      }
      return api.createWorkItem(client, payload);
    },
    update_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateWorkItem(client, payload);
    },
    delete_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteWorkItem(client, getRequiredId(args) as string);
    },
    get_work_item_history: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItemHistory(client, getRequiredId(args) as string, pickPagination(args));
    },
    get_work_item_versions: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItemVersions(client, getRequiredId(args) as string);
    },
    restore_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.restoreWorkItem(client, getRequiredId(args) as string);
    },
    upload_work_item_attachment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredId(args) as string;
      const filename = getRequiredString(args, "filename");
      const contentType = getRequiredString(args, "contentType");
      const contentBase64 = getRequiredString(args, "contentBase64");
      return api.uploadWorkItemAttachment(client, id, filename, contentType, contentBase64);
    },
  };

  return { tools, handlers };
}
