import type { TestITApiClient } from "../client.js";
import * as api from "../api/configurations.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalObjectPayload,
  getOptionalString,
  getRequiredId,
  getRequiredString,
  resolveProjectId,
} from "./utils.js";

const idOnly = (description: string) => ({
  type: "object" as const,
  properties: { id: { type: "string", description } },
  required: ["id"],
});

const PARAMETERS_SCHEMA = {
  type: "object",
  additionalProperties: { type: "string" },
  description: 'Key/value parameters, e.g. {"browser": "firefox", "os": "linux"}.',
} as const;

export function createConfigurationTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_configurations",
      description:
        "List configurations for a project. Every project has a default one (\"Any\"); test points and " +
        "results are always bound to a configuration.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
        },
      },
    },
    {
      name: "get_configuration",
      description: "Get a configuration by ID.",
      inputSchema: idOnly("Configuration UUID."),
    },
    {
      name: "create_configuration",
      description:
        "Create a configuration (environment such as browser/OS). Extra ConfigurationPostModel fields can " +
        "go into \"payload\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          parameters: PARAMETERS_SCHEMA,
          isDefault: { type: "boolean", description: "Make it the project's default (default false)." },
          payload: { type: "object", additionalProperties: true },
        },
        required: ["name"],
      },
    },
    {
      name: "set_configuration",
      description:
        "Partially update a configuration: only the given fields change (JSON Patch). Prefer this over " +
        "update_configuration.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Configuration UUID." },
          name: { type: "string" },
          description: { type: "string" },
          parameters: { ...PARAMETERS_SCHEMA, description: "Replaces the whole parameters map." },
          isDefault: { type: "boolean" },
        },
        required: ["id"],
      },
    },
    {
      name: "update_configuration",
      description:
        "Replace a configuration (PUT, ConfigurationPutModel with id). Fields not sent are cleared; " +
        "use set_configuration for partial changes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "delete_configuration",
      description: "Delete (archive) a configuration. Use restore_configuration to undo or purge_configuration to remove it for good.",
      inputSchema: idOnly("Configuration UUID."),
    },
    {
      name: "restore_configuration",
      description: "Restore an archived configuration.",
      inputSchema: idOnly("Configuration UUID."),
    },
    {
      name: "purge_configuration",
      description: "Permanently delete an archived configuration. Irreversible; delete (archive) it first.",
      inputSchema: idOnly("Configuration UUID."),
    },
  ];

  const handlers = {
    list_configurations: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listConfigurations(client, projectId, {});
    },
    get_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getConfiguration(client, getRequiredId(args) as string);
    },
    create_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = {
        parameters: {},
        isDefault: false,
        ...(getOptionalObjectPayload(args, "payload") ?? {}),
      };
      const typed: Record<string, unknown> = {
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
        parameters: getOptionalObjectPayload(args, "parameters"),
        isDefault: getOptionalBoolean(args, "isDefault"),
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
      return api.createConfiguration(client, body);
    },
    set_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const changes: Record<string, unknown> = {
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
        parameters: getOptionalObjectPayload(args, "parameters"),
        isDefault: getOptionalBoolean(args, "isDefault"),
      };
      const operations = Object.entries(changes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ op: "replace", path: `/${key}`, value }));
      if (operations.length === 0) {
        throw new Error("Nothing to update: pass at least one of name, description, parameters, isDefault.");
      }
      return api.patchConfiguration(client, getRequiredString(args, "id"), operations);
    },
    update_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateConfiguration(client, payload);
    },
    delete_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteConfiguration(client, getRequiredString(args, "id"));
    },
    restore_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.restoreConfiguration(client, getRequiredString(args, "id"));
    },
    purge_configuration: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.purgeConfiguration(client, getRequiredString(args, "id"));
    },
  };

  return { tools, handlers };
}
