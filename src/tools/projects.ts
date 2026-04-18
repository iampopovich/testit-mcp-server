import type { TestITApiClient } from "../client.js";
import * as api from "../api/projects.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getRequiredId,
  pickPagination,
} from "./utils.js";

export function createProjectTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_projects",
      description: "List all projects.",
      inputSchema: {
        type: "object" as const,
        properties: {
          page: { type: "number" },
          size: { type: "number" },
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
      description: "Create a new project.",
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
      description: "Update an existing project (PUT).",
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
      name: "search_projects",
      description: "Search projects by filter.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "object", description: "Search filter object." },
          page: { type: "number" },
          size: { type: "number" },
        },
        required: ["query"],
      },
    },
  ];

  const handlers = {
    list_projects: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listProjects(client, pickPagination(args));
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
  };

  return { tools, handlers };
}
