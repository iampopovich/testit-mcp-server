import type { TestITApiClient } from "../client.js";
import * as api from "../api/test-results.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalNumber,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredId,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  type ToolArgs,
} from "./utils.js";

const OUTCOMES = ["InProgress", "Passed", "Failed", "Skipped", "Blocked"] as const;

function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

/** Fields that can be changed on a single test result via JSON Patch. */
const PATCHABLE_FIELDS = {
  statusCode: {
    type: "string",
    description: "Status code, e.g. PASSED, FAILED, BLOCKED, SKIPPED (full list incl. custom: list_test_statuses).",
  },
  comment: { type: "string" },
  message: { type: "string", description: "Failure/info message." },
  trace: { type: "string", description: "Stack trace." },
  durationInMs: { type: "number" },
} as const;

function buildPatchOperations(args: ToolArgs): Array<Record<string, unknown>> {
  const ops: Array<Record<string, unknown>> = [];
  const values: Record<string, unknown> = {
    statusCode: getOptionalString(args, "statusCode"),
    comment: getOptionalString(args, "comment"),
    message: getOptionalString(args, "message"),
    trace: getOptionalString(args, "trace"),
    durationInMs: getOptionalNumber(args, "durationInMs"),
  };
  for (const [field, value] of Object.entries(values)) {
    if (value !== undefined) {
      ops.push({ op: "replace", path: `/${field}`, value });
    }
  }
  if (Array.isArray(args.operations)) {
    ops.push(...(args.operations as Array<Record<string, unknown>>));
  }
  return ops;
}

export function createTestResultTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "get_test_result",
      description: "Get a test result by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "search_test_results",
      description:
        "Search test results. Typed fields are merged with an optional raw \"query\" " +
        "(TestResultsFilterApiModel) for advanced fields.",
      inputSchema: {
        type: "object" as const,
        properties: {
          testRunIds: { type: "array", items: { type: "string" } },
          configurationIds: { type: "array", items: { type: "string" } },
          outcomes: { type: "array", items: { type: "string", enum: [...OUTCOMES] } },
          statusCodes: { type: "array", items: { type: "string" } },
          name: { type: "string" },
          query: { type: "object", additionalProperties: true },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "set_test_result",
      description:
        "Change selected fields of a test result (JSON Patch) without touching the others. " +
        "To change the result status use statusCode (patching outcome is ignored by TestIT). " +
        "Raw RFC 6902 operations can be added via \"operations\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test result UUID." },
          ...PATCHABLE_FIELDS,
          operations: {
            type: "array",
            items: { type: "object", additionalProperties: true },
            description: "Extra JSON Patch operations [{op, path, value}].",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "update_test_result",
      description:
        "Replace a test result (PUT). WARNING: this is a full replacement — fields not sent " +
        "(comment, message, links, step results...) are cleared. Prefer set_test_result for partial changes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test result UUID." },
          outcome: { type: "string", enum: [...OUTCOMES] },
          statusCode: { type: "string" },
          comment: { type: "string" },
          message: { type: "string" },
          trace: { type: "string" },
          durationInMs: { type: "number" },
          payload: {
            type: "object",
            additionalProperties: true,
            description: "Raw TestResultUpdateV2Request fields; typed args take precedence.",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "submit_test_run_results",
      description:
        "Send autotest results into a test run (POST /testRuns/{id}/testResults). Each result needs an " +
        "existing autotest externalId and a configurationId. Returns created test result IDs.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Test run UUID." },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                autoTestExternalId: { type: "string" },
                configurationId: { type: "string" },
                statusCode: { type: "string", description: "e.g. Passed, Failed, Skipped, Blocked (see list_test_statuses)." },
                outcome: { type: "string", enum: [...OUTCOMES] },
                message: { type: "string" },
                traces: { type: "string" },
                duration: { type: "number", description: "Duration in ms." },
                startedOn: { type: "string" },
                completedOn: { type: "string" },
              },
              required: ["autoTestExternalId", "configurationId"],
              additionalProperties: true,
            },
          },
        },
        required: ["id", "results"],
      },
    },
  ];

  const handlers = {
    get_test_result: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getTestResult(client, getRequiredId(args) as string);
    },
    search_test_results: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body = {
        ...(getOptionalObjectPayload(args, "query") ?? {}),
        ...compact({
          testRunIds: getOptionalStringArray(args, "testRunIds"),
          configurationIds: getOptionalStringArray(args, "configurationIds"),
          outcomes: getOptionalStringArray(args, "outcomes"),
          statusCodes: getOptionalStringArray(args, "statusCodes"),
          name: getOptionalString(args, "name"),
        }),
      };
      return api.searchTestResults(client, body, pickPagination(args));
    },
    set_test_result: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredString(args, "id");
      const ops = buildPatchOperations(args);
      if (ops.length === 0) {
        throw new Error("Nothing to change: pass at least one field or \"operations\".");
      }
      return api.patchTestResult(client, id, ops);
    },
    update_test_result: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredString(args, "id");
      const body = {
        ...(getOptionalObjectPayload(args, "payload") ?? {}),
        ...compact({
          outcome: getOptionalString(args, "outcome"),
          statusCode: getOptionalString(args, "statusCode"),
          comment: getOptionalString(args, "comment"),
          message: getOptionalString(args, "message"),
          trace: getOptionalString(args, "trace"),
          durationInMs: getOptionalNumber(args, "durationInMs"),
        }),
      };
      return api.updateTestResult(client, id, body);
    },
    submit_test_run_results: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredString(args, "id");
      if (!Array.isArray(args.results) || args.results.length === 0) {
        throw new Error("\"results\" must be a non-empty array.");
      }
      return api.submitTestRunResults(client, id, args.results as Array<Record<string, unknown>>);
    },
  };

  return { tools, handlers };
}
