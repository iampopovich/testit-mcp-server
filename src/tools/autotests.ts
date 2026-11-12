import type { TestITApiClient } from "../client.js";
import * as api from "../api/autotests.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
} from "./utils.js";

const STEPS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: { title: { type: "string" }, description: { type: "string" } },
    required: ["title"],
  },
} as const;

const compact = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const idOnly = (description: string) => ({
  type: "object" as const,
  properties: { id: { type: "string", description } },
  required: ["id"],
});

const linkSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Autotest UUID." },
    workItemId: { type: "string", description: "Work item (test case) UUID." },
  },
  required: ["id", "workItemId"],
};

export function createAutoTestTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "search_autotests",
      description:
        "Search autotests. Typed fields are merged over an optional raw \"filter\" (AutoTestFilterApiModel). " +
        "projectIds defaults to the current project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string" },
          projectName: { type: "string" },
          externalIds: { type: "array", items: { type: "string" } },
          name: { type: "string" },
          namespace: { type: "string" },
          className: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          isFlaky: { type: "boolean" },
          isDeleted: { type: "boolean" },
          filter: { type: "object", additionalProperties: true },
          includes: {
            type: "object",
            additionalProperties: true,
            description: "AutoTestSearchIncludeApiModel (e.g. includeSteps, includeLinks, includeLabels).",
          },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_autotest",
      description: "Get an autotest by UUID.",
      inputSchema: idOnly("Autotest UUID."),
    },
    {
      name: "create_autotest",
      description:
        "Create an autotest. Linking it to test cases (workItemIds) makes those cases automated, which " +
        "is required to create test runs from a test plan. Results are later sent by externalId " +
        "(submit_test_run_results). Extra AutoTestCreateApiModel fields can go into \"payload\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string" },
          externalId: { type: "string", description: "Stable ID of the test in your code, unique per project." },
          name: { type: "string" },
          namespace: { type: "string" },
          classname: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          workItemIds: {
            type: "array",
            items: { type: "string" },
            description: "Work item UUIDs to link the autotest with.",
          },
          steps: STEPS_SCHEMA,
          setup: STEPS_SCHEMA,
          teardown: STEPS_SCHEMA,
          payload: { type: "object", additionalProperties: true },
        },
        required: ["externalId", "name"],
      },
    },
    {
      name: "delete_autotest",
      description: "Delete an autotest PERMANENTLY (no archive/restore for autotests).",
      inputSchema: idOnly("Autotest UUID."),
    },
    {
      name: "list_autotest_work_items",
      description: "List work items (test cases) linked to an autotest.",
      inputSchema: idOnly("Autotest UUID."),
    },
    {
      name: "link_autotest_work_item",
      description: "Link an autotest to a work item; the work item becomes automated.",
      inputSchema: linkSchema,
    },
    {
      name: "unlink_autotest_work_item",
      description: "Remove the link between an autotest and a work item.",
      inputSchema: linkSchema,
    },
  ];

  const handlers = {
    search_autotests: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const raw = getOptionalObjectPayload(args, "filter") ?? {};
      const projectIds =
        typeof args.projectId === "string" || typeof args.projectName === "string" || !raw.projectIds
          ? [await resolveProjectId(args, client)]
          : undefined;
      const filter = {
        ...raw,
        ...compact({
          projectIds,
          externalIds: getOptionalStringArray(args, "externalIds"),
          name: getOptionalString(args, "name"),
          namespace: getOptionalString(args, "namespace"),
          className: getOptionalString(args, "className"),
          tags: getOptionalStringArray(args, "tags"),
          isFlaky: getOptionalBoolean(args, "isFlaky"),
          isDeleted: getOptionalBoolean(args, "isDeleted"),
        }),
      };
      const includes = getOptionalObjectPayload(args, "includes");
      return api.searchAutoTests(client, compact({ filter, includes }) as never, pickPagination(args));
    },
    get_autotest: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getAutoTest(client, getRequiredString(args, "id"));
    },
    create_autotest: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = {
        ...(getOptionalObjectPayload(args, "payload") ?? {}),
        ...compact({
          externalId: getRequiredString(args, "externalId"),
          name: getRequiredString(args, "name"),
          namespace: getOptionalString(args, "namespace"),
          classname: getOptionalString(args, "classname"),
          title: getOptionalString(args, "title"),
          description: getOptionalString(args, "description"),
          tags: getOptionalStringArray(args, "tags"),
          workItemIdsForLinkWithAutoTest: getOptionalStringArray(args, "workItemIds"),
          steps: Array.isArray(args.steps) ? args.steps : undefined,
          setup: Array.isArray(args.setup) ? args.setup : undefined,
          teardown: Array.isArray(args.teardown) ? args.teardown : undefined,
        }),
      };
      body.projectId = await resolveProjectId(args, client);
      return api.createAutoTest(client, body);
    },
    delete_autotest: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteAutoTest(client, getRequiredString(args, "id"));
    },
    list_autotest_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listAutoTestWorkItems(client, getRequiredString(args, "id"));
    },
    link_autotest_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.linkAutoTestWorkItem(client, getRequiredString(args, "id"), getRequiredString(args, "workItemId"));
    },
    unlink_autotest_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.unlinkAutoTestWorkItem(client, getRequiredString(args, "id"), getRequiredString(args, "workItemId"));
    },
  };

  return { tools, handlers };
}
