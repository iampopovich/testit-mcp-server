import type { TestITApiClient } from "../client.js";
import * as api from "../api/dictionaries.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

/**
 * Reference data a model needs to fill other tools' arguments without guessing:
 * result status codes, existing tags, project custom attributes.
 */
export function createDictionaryTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "list_test_statuses",
      description:
        "List test result statuses (system and custom): code, name, type. Use \"code\" as statusCode in " +
        "submit_test_run_results / set_test_result (codes are case-insensitive, e.g. PASSED, FAILED, BLOCKED).",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "list_tags",
      description:
        "List tags. With projectId/projectName: tags used by that project's work items (plain names). " +
        "Without: all tags in the instance (search with searchValue).",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          ...PAGINATION_PROPERTIES,
          searchValue: { type: "string", description: "Substring of the tag name (instance-wide mode)." },
        },
      },
    },
    {
      name: "list_project_attributes",
      description:
        "List custom attributes of a project (id, name, type, isRequired, options). Use attribute ids as " +
        "keys of \"attributes\" when creating work items or test plans.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          isDeleted: { type: "boolean" },
        },
      },
    },
  ];

  const handlers = {
    list_test_statuses: async () => {
      const result = await api.searchTestStatuses(client, {});
      return result.data;
    },
    list_tags: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      if (typeof args.projectId === "string" || typeof args.projectName === "string") {
        return api.listProjectWorkItemTags(client, await resolveProjectId(args, client));
      }
      const query = pickPagination(args);
      if (query.SearchValue && !query.SearchField) {
        query.SearchField = "name";
      }
      return api.searchTags(client, query);
    },
    list_project_attributes: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listProjectAttributes(client, await resolveProjectId(args, client), {
        isDeleted: getOptionalBoolean(args, "isDeleted"),
      });
    },
  };

  return { tools, handlers };
}
