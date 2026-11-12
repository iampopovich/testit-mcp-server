import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-suites.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  type ToolArgs,
} from "./utils.js";

const TEST_POINT_STATUSES = ["InProgress", "Passed", "Failed", "NoResults", "Blocked", "Skipped"] as const;

function requireStringArray(args: ToolArgs, key: string): string[] {
  const value = getOptionalStringArray(args, key);
  if (!value) {
    throw new Error(`"${key}" must be an array of strings.`);
  }
  return value;
}

const idOnly = (description: string) => ({
  type: "object" as const,
  properties: { id: { type: "string", description } },
  required: ["id"],
});

export function createTestSuiteTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "list_test_plan_test_suites",
      description: "Get the test suite tree of a test plan (suites with nested children).",
      inputSchema: {
        type: "object" as const,
        properties: { testPlanId: { type: "string", description: "Test plan UUID." } },
        required: ["testPlanId"],
      },
    },
    {
      name: "get_test_suite",
      description: "Get a test suite by ID.",
      inputSchema: idOnly("Test suite UUID."),
    },
    {
      name: "create_test_suite",
      description:
        "Create a test suite in a test plan (top-level, or nested under parentId). " +
        "Then fill it with set_test_suite_work_items.",
      inputSchema: {
        type: "object" as const,
        properties: {
          testPlanId: { type: "string" },
          name: { type: "string" },
          parentId: { type: "string", description: "Parent suite UUID for a nested suite." },
          type: { type: "string", enum: ["Custom", "Dynamic", "Tree"], description: "Default Custom." },
        },
        required: ["testPlanId", "name"],
      },
    },
    {
      name: "set_test_suite_work_items",
      description:
        "Set the work items of a test suite. REPLACES the current list; test points are created for " +
        "each work item x suite configuration (the default configuration if none set).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test suite UUID." },
          workItemIds: { type: "array", items: { type: "string" } },
        },
        required: ["id", "workItemIds"],
      },
    },
    {
      name: "set_test_suite_configurations",
      description: "Set the configurations of a test suite (replaces the current list).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test suite UUID." },
          configurationIds: { type: "array", items: { type: "string" } },
        },
        required: ["id", "configurationIds"],
      },
    },
    {
      name: "list_test_suite_test_points",
      description: "List test points of a test suite (work item x configuration, with status and tester).",
      inputSchema: idOnly("Test suite UUID."),
    },
    {
      name: "search_test_points",
      description:
        "Search test points across test plans/suites. Typed fields are merged with an optional raw " +
        "\"filter\" (TestPointFilterRequestModel).",
      inputSchema: {
        type: "object" as const,
        properties: {
          testPlanIds: { type: "array", items: { type: "string" } },
          testSuiteIds: { type: "array", items: { type: "string" } },
          configurationIds: { type: "array", items: { type: "string" } },
          testerIds: { type: "array", items: { type: "string" } },
          statuses: { type: "array", items: { type: "string", enum: [...TEST_POINT_STATUSES] } },
          name: { type: "string" },
          filter: { type: "object", additionalProperties: true },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "delete_test_suite",
      description: "Delete a test suite with its nested suites and test points.",
      inputSchema: idOnly("Test suite UUID."),
    },
  ];

  const handlers = {
    list_test_plan_test_suites: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listTestPlanTestSuites(client, getRequiredString(args, "testPlanId"));
    },
    get_test_suite: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestSuite(client, getRequiredString(args, "id"));
    },
    create_test_suite: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = {
        testPlanId: getRequiredString(args, "testPlanId"),
        name: getRequiredString(args, "name"),
      };
      const parentId = getOptionalString(args, "parentId");
      const type = getOptionalString(args, "type");
      if (parentId) body.parentId = parentId;
      if (type) body.type = type;
      return api.createTestSuite(client, body);
    },
    set_test_suite_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.setTestSuiteWorkItems(client, getRequiredString(args, "id"), requireStringArray(args, "workItemIds"));
    },
    set_test_suite_configurations: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.setTestSuiteConfigurations(
        client,
        getRequiredString(args, "id"),
        requireStringArray(args, "configurationIds"),
      );
    },
    list_test_suite_test_points: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listTestSuiteTestPoints(client, getRequiredString(args, "id"));
    },
    search_test_points: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const typed = Object.fromEntries(
        Object.entries({
          testPlanIds: getOptionalStringArray(args, "testPlanIds"),
          testSuiteIds: getOptionalStringArray(args, "testSuiteIds"),
          configurationIds: getOptionalStringArray(args, "configurationIds"),
          testerIds: getOptionalStringArray(args, "testerIds"),
          statuses: getOptionalStringArray(args, "statuses"),
          name: getOptionalString(args, "name"),
        }).filter(([, value]) => value !== undefined),
      );
      return api.searchTestPoints(
        client,
        { ...(getOptionalObjectPayload(args, "filter") ?? {}), ...typed },
        pickPagination(args),
      );
    },
    delete_test_suite: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteTestSuite(client, getRequiredString(args, "id"));
    },
  };

  return { tools, handlers };
}
