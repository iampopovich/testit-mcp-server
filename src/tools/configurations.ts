import type { TestITApiClient } from "../client.js";
import * as api from "../api/configurations.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

export function createConfigurationTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_configurations",
      description: "List configurations for a project.",
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
      name: "get_configuration",
      description: "Get a configuration by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "create_configuration",
      description: "Create a new configuration.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "update_configuration",
      description: "Update an existing configuration.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
  ];

  const handlers = {
    list_configurations: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listConfigurations(client, projectId, pickPagination(args));
    },
    get_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getConfiguration(client, getRequiredId(args) as string);
    },
    create_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      if (!payload.projectId && client.defaultProjectId) {
        payload.projectId = client.defaultProjectId;
      }
      return api.createConfiguration(client, payload);
    },
    update_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateConfiguration(client, payload);
    },
  };

  return { tools, handlers };
}
