import type { TestITApiClient } from "../client.js";
import * as api from "../api/sections.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalString,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

const STEPS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      action: { type: "string" },
      expected: { type: "string" },
      testData: { type: "string" },
      comments: { type: "string" },
    },
  },
} as const;

/** Root section of a project: the only one without a parent. */
async function findRootSectionId(client: TestITApiClient, projectId: string): Promise<string> {
  const sections = await api.listSections(client, projectId, {});
  const root = sections.find((section) => section.parentId === null);
  if (!root) {
    throw new Error(`Root section of project ${projectId} not found.`);
  }
  return root.id;
}

export function createSectionTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "list_sections",
      description:
        "List all sections (folders) of a project as a flat list with parentId. The root section " +
        "has parentId=null. Use section IDs as sectionId when creating work items.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_section",
      description: "Get a section with its precondition/postcondition steps.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Section UUID." },
          isDeleted: { type: "boolean", description: "Set true to read an archived section." },
        },
        required: ["id"],
      },
    },
    {
      name: "create_section",
      description:
        "Create a section. parentId defaults to the project's root section (TestIT rejects parentId=null).",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string" },
          name: { type: "string" },
          parentId: { type: "string", description: "Parent section UUID (default: root section)." },
          preconditionSteps: STEPS_SCHEMA,
          postconditionSteps: STEPS_SCHEMA,
        },
        required: ["name"],
      },
    },
    {
      name: "rename_section",
      description: "Rename a section.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Section UUID." },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
    },
    {
      name: "move_section",
      description:
        "Move a section (with its work items and subsections) under another parent. " +
        "Optionally place it before nextSectionId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Section UUID to move." },
          parentId: { type: "string", description: "New parent section UUID." },
          nextSectionId: { type: "string", description: "Sibling to insert before (optional)." },
        },
        required: ["id", "parentId"],
      },
    },
    {
      name: "delete_section",
      description: "Delete (archive) a section together with its subsections and work items.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Section UUID." } },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_sections: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.listSections(client, projectId, pickPagination(args));
    },
    get_section: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getSection(client, getRequiredString(args, "id"), {
        isDeleted: getOptionalBoolean(args, "isDeleted"),
      });
    },
    create_section: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      const parentId = getOptionalString(args, "parentId") ?? (await findRootSectionId(client, projectId));
      const body: Record<string, unknown> = {
        projectId,
        name: getRequiredString(args, "name"),
        parentId,
        attachments: [],
      };
      if (Array.isArray(args.preconditionSteps)) body.preconditionSteps = args.preconditionSteps;
      if (Array.isArray(args.postconditionSteps)) body.postconditionSteps = args.postconditionSteps;
      return api.createSection(client, body);
    },
    rename_section: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.renameSection(client, getRequiredString(args, "id"), getRequiredString(args, "name"));
    },
    move_section: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredString(args, "id");
      // The API needs the current parent too; look it up so callers don't have to.
      const current = await api.getSection(client, id);
      if (!current.parentId) {
        throw new Error("The root section cannot be moved.");
      }
      return api.moveSection(client, {
        id,
        oldParentId: current.parentId,
        parentId: getRequiredString(args, "parentId"),
        nextSectionId: getOptionalString(args, "nextSectionId"),
      });
    },
    delete_section: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteSection(client, getRequiredString(args, "id"));
    },
  };

  return { tools, handlers };
}
