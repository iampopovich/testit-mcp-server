import type { TestITApiClient } from "../client.js";
import * as api from "../api/projects.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalString,
  getRequiredId,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

export function createProjectTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_projects",
      description: "List projects, optionally filtered by name, archive or favorite flag.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Filter by (part of) project name." },
          isDeleted: { type: "boolean", description: "Return archived projects." },
          isFavorite: { type: "boolean" },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_project",
      description: "Get a project by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "create_project",
      description:
        "Create a new project (payload: CreateProjectApiModel, at least name). Cloud instances may answer 402 " +
        "when the plan's project limit is reached.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "update_project",
      description: "Replace a project (PUT, full model with id); fields not sent are cleared. Prefer set_project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "delete_project",
      description: "Delete a project by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Project UUID." } },
        required: ["id"],
      },
    },
    {
      name: "set_project",
      description: "Partially update a project (JSON Patch): only name/description you pass change.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Project UUID." },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["id"],
      },
    },
    {
      name: "list_project_autotest_namespaces",
      description: "Autotest namespaces of a project with their classes (for filtering search_autotests).",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
        },
      },
    },
    {
      name: "search_projects",
      description: "Search projects by filter.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "object", description: "Search filter object." },
          ...PAGINATION_PROPERTIES,
        },
        required: ["query"],
      },
    },
  ];

  const handlers = {
    list_projects: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = Object.fromEntries(
        Object.entries({
          name: getOptionalString(args, "name"),
          isDeleted: getOptionalBoolean(args, "isDeleted"),
          isFavorite: getOptionalBoolean(args, "isFavorite"),
        }).filter(([, value]) => value !== undefined),
      );
      return api.searchProjects(client, filter, pickPagination(args));
    },
    get_project: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getProject(client, getRequiredId(args) as string);
    },
    create_project: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.createProject(client, payload);
    },
    update_project: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateProject(client, payload);
    },
    delete_project: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteProject(client, getRequiredId(args) as string);
    },
    search_projects: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const query = (args.query as Record<string, unknown>) || {};
      return api.searchProjects(client, query, pickPagination(args));
    },
    set_project: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const operations = Object.entries({
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
      })
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ op: "replace", path: `/${key}`, value }));
      if (operations.length === 0) {
        throw new Error("Nothing to update: pass name and/or description.");
      }
      return api.patchProject(client, getRequiredId(args) as string, operations);
    },
    list_project_autotest_namespaces: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listProjectAutoTestNamespaces(client, await resolveProjectId(args, client));
    },
  };

  return { tools, handlers };
}
