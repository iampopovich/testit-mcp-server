import type { TestITApiClient } from "../client.js";
import * as api from "../api/custom-attributes.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  type ToolArgs,
} from "./utils.js";

const ATTRIBUTE_TYPES = ["string", "datetime", "options", "user", "multipleOptions", "checkbox"] as const;

const compact = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const PROJECT = {
  projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
  projectName: { type: "string" },
} as const;

const NEW_ATTRIBUTE = {
  name: { type: "string" },
  type: { type: "string", enum: [...ATTRIBUTE_TYPES] },
  options: {
    type: "array",
    items: { type: "string" },
    description: "Option values for options/multipleOptions types.",
  },
  defaultOption: { type: "string", description: "Which of the options is the default." },
  isRequired: { type: "boolean", description: "Default false." },
  isEnabled: { type: "boolean", description: "Default true." },
} as const;

const FLAGS_UPDATE = {
  name: { type: "string" },
  isRequired: { type: "boolean" },
  isEnabled: { type: "boolean" },
} as const;

function requireIds(args: ToolArgs, key: string): string[] {
  const ids = getOptionalStringArray(args, key);
  if (!ids || ids.length === 0) {
    throw new Error(`"${key}" must be a non-empty array of UUIDs.`);
  }
  return ids;
}

function newAttributeBody(args: ToolArgs): Record<string, unknown> {
  const type = getRequiredString(args, "type");
  if (!(ATTRIBUTE_TYPES as readonly string[]).includes(type)) {
    throw new Error(`"type" must be one of: ${ATTRIBUTE_TYPES.join(", ")}.`);
  }
  const options = getOptionalStringArray(args, "options");
  const defaultOption = getOptionalString(args, "defaultOption");
  return compact({
    name: getRequiredString(args, "name"),
    type,
    isEnabled: getOptionalBoolean(args, "isEnabled") ?? true,
    isRequired: getOptionalBoolean(args, "isRequired") ?? false,
    options: options?.map((value) => ({ value, isDefault: value === defaultOption })),
  });
}

/** Changes name/flags of an existing attribute, keeping everything else (incl. option ids). */
function mergeFlags(current: Record<string, unknown>, args: ToolArgs): Record<string, unknown> {
  const changes = compact({
    name: getOptionalString(args, "name"),
    isRequired: getOptionalBoolean(args, "isRequired"),
    isEnabled: getOptionalBoolean(args, "isEnabled"),
  });
  if (Object.keys(changes).length === 0) {
    throw new Error("Nothing to update: pass at least one of name, isRequired, isEnabled.");
  }
  return { ...current, ...changes };
}

const id = (description: string) => ({ id: { type: "string", description } });

/** Opt-in admin toolset: custom attributes (global/project/test plan) and attribute templates. */
export function createCustomAttributeTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "search_custom_attributes",
      description:
        "Search custom attributes across the instance (global and project ones). Active only unless isDeleted=true.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string" },
          types: { type: "array", items: { type: "string", enum: [...ATTRIBUTE_TYPES] } },
          isGlobal: { type: "boolean" },
          isDeleted: { type: "boolean", description: "Default false." },
          projectIds: { type: "array", items: { type: "string" } },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_custom_attribute",
      description: "Get a custom attribute (with options and their ids).",
      inputSchema: { type: "object" as const, properties: id("Attribute UUID."), required: ["id"] },
    },
    {
      name: "create_global_attribute",
      description:
        "Create a global custom attribute (available to all projects after link_project_global_attributes).",
      inputSchema: { type: "object" as const, properties: NEW_ATTRIBUTE, required: ["name", "type"] },
    },
    {
      name: "set_global_attribute",
      description: "Change name/isRequired/isEnabled of a global attribute; options are kept.",
      inputSchema: {
        type: "object" as const,
        properties: { ...id("Global attribute UUID."), ...FLAGS_UPDATE },
        required: ["id"],
      },
    },
    {
      name: "delete_global_attribute",
      description:
        "Delete (archive) a global attribute everywhere. The API has no restore or purge for attributes.",
      inputSchema: { type: "object" as const, properties: id("Global attribute UUID."), required: ["id"] },
    },
    {
      name: "link_project_global_attributes",
      description: "Make global attributes available in a project (they appear in list_project_attributes).",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, attributeIds: { type: "array", items: { type: "string" } } },
        required: ["attributeIds"],
      },
    },
    {
      name: "get_project_attribute",
      description: "Get a custom attribute of a project.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...id("Attribute UUID.") },
        required: ["id"],
      },
    },
    {
      name: "create_project_attribute",
      description:
        "Create a project-only custom attribute. Use its id as a key of \"attributes\" in create_work_item.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...NEW_ATTRIBUTE },
        required: ["name", "type"],
      },
    },
    {
      name: "set_project_attribute",
      description: "Change name/isRequired/isEnabled of a project attribute; type and options are kept.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...id("Attribute UUID."), ...FLAGS_UPDATE },
        required: ["id"],
      },
    },
    {
      name: "delete_project_attribute",
      description:
        "Remove an attribute from a project: a project attribute is archived (no restore), a global one is only " +
        "detached from the project.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...id("Attribute UUID.") },
        required: ["id"],
      },
    },
    {
      name: "list_test_plan_attributes",
      description: "Custom attributes enabled for test plans of a project.",
      inputSchema: { type: "object" as const, properties: PROJECT },
    },
    {
      name: "link_test_plan_attributes",
      description: "Enable (global) attributes for test plans of a project.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, attributeIds: { type: "array", items: { type: "string" } } },
        required: ["attributeIds"],
      },
    },
    {
      name: "set_test_plan_attribute",
      description: "Set isEnabled/isRequired of a test plan attribute in a project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ...PROJECT,
          ...id("Attribute UUID."),
          isEnabled: { type: "boolean" },
          isRequired: { type: "boolean" },
        },
        required: ["id", "isEnabled", "isRequired"],
      },
    },
    {
      name: "unlink_test_plan_attribute",
      description: "Disable an attribute for test plans of a project.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...id("Attribute UUID.") },
        required: ["id"],
      },
    },
    {
      name: "search_attribute_templates",
      description:
        "Search custom attribute templates (named sets of global attributes) with their attributes. Active only " +
        "unless isDeleted=true.",
      inputSchema: {
        type: "object" as const,
        properties: { name: { type: "string" }, isDeleted: { type: "boolean" }, ...PAGINATION_PROPERTIES },
      },
    },
    {
      name: "create_attribute_template",
      description: "Create a template from at least 2 global attributes (TestIT rejects fewer).",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string" },
          attributeIds: { type: "array", items: { type: "string" }, description: "At least 2." },
        },
        required: ["name", "attributeIds"],
      },
    },
    {
      name: "link_attribute_template_attributes",
      description: "Add global attributes to a template.",
      inputSchema: {
        type: "object" as const,
        properties: { ...id("Template UUID."), attributeIds: { type: "array", items: { type: "string" } } },
        required: ["id", "attributeIds"],
      },
    },
    {
      name: "unlink_attribute_template_attributes",
      description:
        "Remove attributes from a template. If fewer than 2 attributes would remain, TestIT DELETES the whole " +
        "template (verified), so keep at least 2.",
      inputSchema: {
        type: "object" as const,
        properties: { ...id("Template UUID."), attributeIds: { type: "array", items: { type: "string" } } },
        required: ["id", "attributeIds"],
      },
    },
    {
      name: "delete_attribute_template",
      description: "Delete (archive) an attribute template; its attributes stay. No restore or purge in the API.",
      inputSchema: { type: "object" as const, properties: id("Template UUID."), required: ["id"] },
    },
    {
      name: "list_project_attribute_templates",
      description: "Attribute templates applied to a project.",
      inputSchema: { type: "object" as const, properties: PROJECT },
    },
    {
      name: "link_project_attribute_template",
      description: "Apply a template to a project: all its attributes become available in the project.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, templateId: { type: "string" } },
        required: ["templateId"],
      },
    },
    {
      name: "unlink_project_attribute_template",
      description: "Remove a template from a project together with its attributes (from that project only).",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, templateId: { type: "string" } },
        required: ["templateId"],
      },
    },
  ];

  const project = (args: ToolArgs) => resolveProjectId(args, client);

  const handlers = {
    search_custom_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = compact({
        name: getOptionalString(args, "name"),
        customAttributeTypes: getOptionalStringArray(args, "types"),
        isGlobal: getOptionalBoolean(args, "isGlobal"),
        isDeleted: getOptionalBoolean(args, "isDeleted") ?? false,
        projectIds: getOptionalStringArray(args, "projectIds"),
      });
      return api.searchCustomAttributes(client, filter, pickPagination(args));
    },
    get_custom_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getCustomAttribute(client, getRequiredString(args, "id"));
    },
    create_global_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.createGlobalAttribute(client, newAttributeBody(args));
    },
    set_global_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const attributeId = getRequiredString(args, "id");
      const current = await api.getCustomAttribute(client, attributeId);
      const merged = mergeFlags(current ?? {}, args);
      return api.updateGlobalAttribute(client, attributeId, {
        name: merged.name,
        isEnabled: merged.isEnabled,
        isRequired: merged.isRequired,
        options: merged.options ?? [],
      });
    },
    delete_global_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteGlobalAttribute(client, getRequiredString(args, "id"));
    },
    link_project_global_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.linkProjectGlobalAttributes(client, await project(args), requireIds(args, "attributeIds"));
    },
    get_project_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getProjectAttribute(client, await project(args), getRequiredString(args, "id"));
    },
    create_project_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.createProjectAttribute(client, await project(args), { ...newAttributeBody(args), isGlobal: false });
    },
    set_project_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await project(args);
      const current = await api.getProjectAttribute(client, projectId, getRequiredString(args, "id"));
      const merged = mergeFlags(current ?? {}, args);
      return api.updateProjectAttribute(client, projectId, {
        id: merged.id ?? getRequiredString(args, "id"),
        name: merged.name,
        type: merged.type,
        options: merged.options ?? [],
        isEnabled: merged.isEnabled,
        isRequired: merged.isRequired,
        isGlobal: merged.isGlobal ?? false,
        isDeleted: merged.isDeleted ?? false,
      });
    },
    delete_project_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteProjectAttribute(client, await project(args), getRequiredString(args, "id"));
    },
    list_test_plan_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listTestPlanAttributes(client, await project(args));
    },
    link_test_plan_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.linkTestPlanAttributes(client, await project(args), requireIds(args, "attributeIds"));
    },
    set_test_plan_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const isEnabled = getOptionalBoolean(args, "isEnabled");
      const isRequired = getOptionalBoolean(args, "isRequired");
      if (isEnabled === undefined || isRequired === undefined) {
        throw new Error('"isEnabled" and "isRequired" must be booleans.');
      }
      return api.updateTestPlanAttribute(client, await project(args), {
        id: getRequiredString(args, "id"),
        isEnabled,
        isRequired,
      });
    },
    unlink_test_plan_attribute: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.unlinkTestPlanAttribute(client, await project(args), getRequiredString(args, "id"));
    },
    search_attribute_templates: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.searchAttributeTemplates(
        client,
        compact({ name: getOptionalString(args, "name"), isDeleted: getOptionalBoolean(args, "isDeleted") ?? false }),
        pickPagination(args),
      );
    },
    create_attribute_template: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const ids = requireIds(args, "attributeIds");
      if (ids.length < 2) {
        throw new Error('"attributeIds" must contain at least 2 attributes (TestIT requirement).');
      }
      return api.createAttributeTemplate(client, { name: getRequiredString(args, "name"), customAttributeIds: ids });
    },
    link_attribute_template_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.includeTemplateAttributes(client, getRequiredString(args, "id"), requireIds(args, "attributeIds"));
    },
    unlink_attribute_template_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.excludeTemplateAttributes(client, getRequiredString(args, "id"), requireIds(args, "attributeIds"));
    },
    delete_attribute_template: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteAttributeTemplate(client, getRequiredString(args, "id"));
    },
    list_project_attribute_templates: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listProjectAttributeTemplates(client, await project(args));
    },
    link_project_attribute_template: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.linkProjectAttributeTemplate(client, await project(args), getRequiredString(args, "templateId"));
    },
    unlink_project_attribute_template: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.unlinkProjectAttributeTemplate(client, await project(args), getRequiredString(args, "templateId"));
    },
  };

  return { tools, handlers };
}
