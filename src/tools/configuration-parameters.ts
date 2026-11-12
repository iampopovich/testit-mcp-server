import type { TestITApiClient } from "../client.js";
import * as api from "../api/configuration-parameters.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  resolveProjectId,
  type ToolArgs,
} from "./utils.js";

type Envelope = { data?: unknown[] };

/** Search returns nested {data,totalCount} envelopes; flatten them to plain arrays. */
function flatten(parameter: Record<string, unknown>): Record<string, unknown> {
  const unwrap = (value: unknown) =>
    value && typeof value === "object" && Array.isArray((value as Envelope).data) ? (value as Envelope).data : value;
  return { ...parameter, values: unwrap(parameter.values), projects: unwrap(parameter.projects) };
}

async function buildBody(args: ToolArgs, client: TestITApiClient): Promise<api.ConfigurationParameterBody> {
  const values = getOptionalStringArray(args, "values");
  if (!values || values.length === 0) {
    throw new Error('"values" must be a non-empty array of strings.');
  }
  const projectIds = getOptionalStringArray(args, "projectIds") ?? [await resolveProjectId(args, client)];
  return {
    name: getRequiredString(args, "name"),
    values: values.map((value) => ({ value })),
    projects: projectIds.map((id) => ({ id })),
  };
}

const PARAMETER_FIELDS = {
  name: { type: "string", description: "Parameter name, e.g. browser." },
  values: { type: "array", items: { type: "string" }, description: "Allowed values, e.g. [\"firefox\", \"chrome\"]." },
  projectIds: {
    type: "array",
    items: { type: "string" },
    description: "Projects the parameter is available in (default: current project).",
  },
  projectId: { type: "string" },
  projectName: { type: "string" },
} as const;

/**
 * Configuration parameters (/api/v2/configuration-parameters) replace the deprecated
 * /api/v2/parameters for configurations. Creating a configuration with {"browser": "x"}
 * auto-creates a "browser" parameter.
 */
export function createConfigurationParameterTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "search_configuration_parameters",
      description:
        "List configuration parameters (e.g. browser, os) with their values and projects. Defaults to the " +
        "current project; name filters by substring.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          name: { type: "string", description: "Substring of the parameter name (applied client-side)." },
        },
      },
    },
    {
      name: "get_configuration_parameter",
      description: "Get a configuration parameter with its values and projects.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Configuration parameter UUID." } },
        required: ["id"],
      },
    },
    {
      name: "create_configuration_parameter",
      description: "Create a configuration parameter with allowed values.",
      inputSchema: { type: "object" as const, properties: PARAMETER_FIELDS, required: ["name", "values"] },
    },
    {
      name: "update_configuration_parameter",
      description:
        "Replace a configuration parameter (PUT): name, the FULL list of values and projects. Values not sent are removed.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Configuration parameter UUID." }, ...PARAMETER_FIELDS },
        required: ["id", "name", "values"],
      },
    },
    {
      name: "delete_configuration_parameter",
      description: "Delete a configuration parameter.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Configuration parameter UUID." } },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    search_configuration_parameters: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const result = await api.searchConfigurationParameters(client, {
        projectIds: [await resolveProjectId(args, client)],
      });
      const name = getOptionalString(args, "name")?.toLowerCase();
      return (result?.data ?? [])
        .map(flatten)
        .filter((parameter) => !name || String(parameter.name).toLowerCase().includes(name));
    },
    get_configuration_parameter: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getConfigurationParameter(client, getRequiredString(args, "id"));
    },
    create_configuration_parameter: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.createConfigurationParameter(client, await buildBody(args, client));
    },
    update_configuration_parameter: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.updateConfigurationParameter(client, getRequiredString(args, "id"), await buildBody(args, client));
    },
    delete_configuration_parameter: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteConfigurationParameter(client, getRequiredString(args, "id"));
    },
  };

  return { tools, handlers };
}
