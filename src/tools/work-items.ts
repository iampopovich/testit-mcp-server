import type { TestITApiClient } from "../client.js";
import * as api from "../api/work-items.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  buildWorkItemFilter,
  getOptionalObjectPayload,
  getOptionalNumber,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  getRequiredId,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  WORK_ITEM_FILTER_PROPERTIES,
  type ToolArgs,
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
      workItemId: { type: "string", description: "Shared step UUID to reference instead of an action." },
    },
  },
} as const;

const DEFAULT_DURATION_MS = 60000;

async function buildCreateWorkItemBody(
  args: ToolArgs,
  client: TestITApiClient,
): Promise<Record<string, unknown>> {
  const raw = { ...(getOptionalObjectPayload(args, "payload") ?? {}) };
  const entityTypeName =
    getOptionalString(args, "entityTypeName") ?? (raw.entityTypeName as string | undefined) ?? "TestCases";
  let projectId = getOptionalString(args, "projectId") ?? (raw.projectId as string | undefined);
  if (!projectId) {
    projectId = await resolveProjectId(args, client);
  }
  const name = getOptionalString(args, "name") ?? (raw.name as string | undefined);
  if (!name) {
    throw new Error("\"name\" is required.");
  }
  const tagNames = getOptionalStringArray(args, "tags");
  let duration = getOptionalNumber(args, "duration") ?? (raw.duration as number | undefined);
  if (entityTypeName === "SharedSteps") {
    duration = 0;
  } else if (duration === undefined) {
    duration = DEFAULT_DURATION_MS;
  }

  const typed: Record<string, unknown> = {
    projectId,
    name,
    entityTypeName,
    state: getOptionalString(args, "state") ?? raw.state ?? "NotReady",
    priority: getOptionalString(args, "priority") ?? raw.priority ?? "Medium",
    duration,
    sectionId: getOptionalString(args, "sectionId"),
    description: getOptionalString(args, "description"),
    tags: tagNames?.map((tag) => ({ name: tag })),
    preconditionSteps: args.preconditionSteps,
    steps: args.steps,
    postconditionSteps: args.postconditionSteps,
    attributes: getOptionalObjectPayload(args, "attributes"),
    attachments: getOptionalStringArray(args, "attachmentIds")?.map((id) => ({ id })),
  };
  for (const [key, value] of Object.entries(typed)) {
    if (value !== undefined) {
      raw[key] = value;
    }
  }
  return raw;
}

export function createWorkItemTools(
  client: TestITApiClient,
): ToolBundle {
  const tools = [
    {
      name: "list_work_items",
      description:
        "List work items (test cases, checklists, shared steps) of a project, with optional filters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID." },
          projectName: {
            type: "string",
            description: "Project name (alternative to projectId).",
          },
          ...WORK_ITEM_FILTER_PROPERTIES,
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "search_work_items",
      description:
        "Search work items across projects. Typed filter fields are combined with an optional raw " +
        "\"filter\" object (TestIT WorkItemFilterApiModel) for advanced fields.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectIds: { type: "array", items: { type: "string" }, description: "Project UUIDs." },
          nameOrId: { type: "string", description: "Work item name part or global ID." },
          globalIds: { type: "array", items: { type: "number" }, description: "Global numeric IDs." },
          ...WORK_ITEM_FILTER_PROPERTIES,
          filter: {
            type: "object",
            additionalProperties: true,
            description: "Raw WorkItemFilterApiModel fields (e.g. createdDate, attributes, autoTestIds).",
          },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_work_item",
      description: "Get a work item by ID (UUID).",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "create_work_item",
      description:
        "Create a test case, checklist or shared step. Defaults: entityTypeName=TestCases, " +
        "state=NotReady, priority=Medium, duration=60000 ms (always 0 for SharedSteps — required by TestIT). " +
        "Extra CreateWorkItemApiModel fields can be passed in \"payload\".",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
          projectName: { type: "string", description: "Project name (alternative to projectId)." },
          name: { type: "string", description: "Work item name." },
          entityTypeName: { type: "string", enum: ["TestCases", "CheckLists", "SharedSteps"] },
          state: { type: "string", enum: ["NeedsWork", "NotReady", "Ready"] },
          priority: { type: "string", enum: ["Lowest", "Low", "Medium", "High", "Highest"] },
          duration: { type: "number", description: "Duration in ms (1..86400000; 0 for SharedSteps)." },
          sectionId: { type: "string", description: "Section UUID (root section if omitted)." },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" }, description: "Tag names." },
          preconditionSteps: STEPS_SCHEMA,
          steps: STEPS_SCHEMA,
          postconditionSteps: STEPS_SCHEMA,
          attributes: { type: "object", additionalProperties: true, description: "Custom attributes {attributeId: value}." },
          attachmentIds: {
            type: "array",
            items: { type: "string" },
            description: "Attachment UUIDs from upload_attachment.",
          },
          payload: {
            type: "object",
            additionalProperties: true,
            description: "Raw CreateWorkItemApiModel fields; typed args take precedence.",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "update_work_item",
      description: "Replace a work item (PUT, full model with id). Fields not sent are cleared; prefer set_work_item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          payload: { type: "object", additionalProperties: true },
        },
        required: ["payload"],
      },
    },
    {
      name: "delete_work_item",
      description: "Delete a work item by ID (UUID).",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "get_work_item_history",
      description: "Get work item history.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
    {
      name: "get_work_item_versions",
      description: "Get all versions of a work item.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "restore_work_item",
      description: "Restore an archived (deleted) work item by ID.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "purge_work_item",
      description:
        "Permanently delete an archived work item. Irreversible; the item must be deleted (archived) first.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "upload_work_item_attachment",
      description: "Upload an attachment to a work item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          filename: { type: "string", description: "File name including extension." },
          contentType: { type: "string", description: "MIME type, e.g. image/png." },
          contentBase64: { type: "string", description: "File content encoded as base64." },
        },
        required: ["id", "filename", "contentType", "contentBase64"],
      },
    },
    {
      name: "set_work_item",
      description:
        "Partially update a work item: only the given fields change (JSON Patch), each call creates a new " +
        "version. Prefer this over update_work_item (full replacement). Use move_work_item to change section.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          name: { type: "string" },
          description: { type: "string" },
          state: { type: "string", enum: ["NeedsWork", "NotReady", "Ready"] },
          priority: { type: "string", enum: ["Lowest", "Low", "Medium", "High", "Highest"] },
          tags: { type: "array", items: { type: "string" }, description: "Tag names; replaces all tags." },
        },
        required: ["id"],
      },
    },
    {
      name: "move_work_item",
      description: "Move a work item to another section (optionally before nextWorkItemId).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          sectionId: { type: "string", description: "Target section UUID (see list_sections)." },
          nextWorkItemId: { type: "string", description: "Place before this work item (optional)." },
        },
        required: ["id", "sectionId"],
      },
    },
    {
      name: "list_work_item_comments",
      description: "List comments of a work item.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "create_work_item_comment",
      description: "Add a comment to a work item.",
      inputSchema: {
        type: "object" as const,
        properties: {
          workItemId: { type: "string", description: "Work item UUID." },
          text: { type: "string" },
        },
        required: ["workItemId", "text"],
      },
    },
    {
      name: "update_work_item_comment",
      description: "Replace the text of a work item comment.",
      inputSchema: {
        type: "object" as const,
        properties: {
          commentId: { type: "string", description: "Comment UUID." },
          text: { type: "string" },
        },
        required: ["commentId", "text"],
      },
    },
    {
      name: "delete_work_item_comment",
      description: "Delete a work item comment.",
      inputSchema: {
        type: "object" as const,
        properties: { commentId: { type: "string", description: "Comment UUID." } },
        required: ["commentId"],
      },
    },
    {
      name: "list_work_item_autotests",
      description: "Autotests linked to a work item.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "unlink_work_item_autotests",
      description:
        "Remove ALL autotest links of a work item; it becomes manual (isAutomated=false). To drop one link use " +
        "unlink_autotest_work_item.",
      inputSchema: {
        type: "object" as const,
        properties: { id: { type: "string", description: "Work item UUID." } },
        required: ["id"],
      },
    },
    {
      name: "list_shared_step_references",
      description: "Where a shared step is used: work items whose steps reference it, and sections (target).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Shared step (work item) UUID." },
          target: { type: "string", enum: ["workItems", "sections"], description: "Default workItems." },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
    {
      name: "get_work_item_test_results_history",
      description:
        "Test results of a work item across test runs/plans (newest first), with optional filters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Work item UUID." },
          from: { type: "string", description: "ISO date-time lower bound." },
          to: { type: "string", description: "ISO date-time upper bound." },
          configurationIds: { type: "array", items: { type: "string" } },
          testPlanIds: { type: "array", items: { type: "string" } },
          testRunIds: { type: "array", items: { type: "string" } },
          statusCodes: { type: "array", items: { type: "string" } },
          ...PAGINATION_PROPERTIES,
        },
        required: ["id"],
      },
    },
  ];

  const handlers = {
    list_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const projectId = await resolveProjectId(args, client);
      return api.searchProjectWorkItems(
        client,
        String(projectId),
        buildWorkItemFilter(args),
        pickPagination(args),
      );
    },
    search_work_items: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      // Backward compatibility: older clients passed the body as "query".
      const legacy = getOptionalObjectPayload(args, "query") ?? {};
      const legacyFilter =
        legacy.filter && typeof legacy.filter === "object"
          ? (legacy.filter as Record<string, unknown>)
          : legacy;
      const typed = Object.fromEntries(
        Object.entries({
          ...buildWorkItemFilter(args),
          projectIds: getOptionalStringArray(args, "projectIds"),
          nameOrId: getOptionalString(args, "nameOrId"),
          globalIds: args.globalIds,
        }).filter(([, value]) => value !== undefined),
      );
      const filter = {
        ...legacyFilter,
        ...(getOptionalObjectPayload(args, "filter") ?? {}),
        ...typed,
      };
      return api.searchWorkItems(client, { filter }, pickPagination(args));
    },
    get_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItem(client, getRequiredId(args) as string);
    },
    create_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.createWorkItem(client, await buildCreateWorkItemBody(args, client));
    },
    update_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const payload = (args.payload as Record<string, unknown>) || {};
      return api.updateWorkItem(client, payload);
    },
    delete_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteWorkItem(client, getRequiredId(args) as string);
    },
    get_work_item_history: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItemHistory(client, getRequiredId(args) as string, pickPagination(args));
    },
    get_work_item_versions: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItemVersions(client, getRequiredId(args) as string);
    },
    restore_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.restoreWorkItem(client, getRequiredId(args) as string);
    },
    purge_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.purgeWorkItem(client, getRequiredId(args) as string);
    },
    upload_work_item_attachment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const id = getRequiredId(args) as string;
      const filename = getRequiredString(args, "filename");
      const contentType = getRequiredString(args, "contentType");
      const contentBase64 = getRequiredString(args, "contentBase64");
      return api.uploadWorkItemAttachment(client, id, filename, contentType, contentBase64);
    },
    set_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const changes: Record<string, unknown> = {
        name: getOptionalString(args, "name"),
        description: getOptionalString(args, "description"),
        state: getOptionalString(args, "state"),
        priority: getOptionalString(args, "priority"),
        tags: getOptionalStringArray(args, "tags")?.map((name) => ({ name })),
      };
      const operations = Object.entries(changes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ op: "replace", path: `/${key}`, value }));
      if (operations.length === 0) {
        throw new Error("Nothing to update: pass at least one of name, description, state, priority, tags.");
      }
      return api.patchWorkItem(client, getRequiredString(args, "id"), operations);
    },
    move_work_item: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const body: Record<string, unknown> = {
        id: getRequiredString(args, "id"),
        newSectionId: getRequiredString(args, "sectionId"),
      };
      const next = getOptionalString(args, "nextWorkItemId");
      if (next) body.nextWorkItemId = next;
      return api.moveWorkItem(client, body);
    },
    list_work_item_comments: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listWorkItemComments(client, getRequiredString(args, "id"));
    },
    create_work_item_comment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.createWorkItemComment(client, getRequiredString(args, "workItemId"), getRequiredString(args, "text"));
    },
    update_work_item_comment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.updateWorkItemComment(client, getRequiredString(args, "commentId"), getRequiredString(args, "text"));
    },
    delete_work_item_comment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteWorkItemComment(client, getRequiredString(args, "commentId"));
    },
    list_work_item_autotests: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listWorkItemAutoTests(client, getRequiredString(args, "id"));
    },
    unlink_work_item_autotests: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.unlinkWorkItemAutoTests(client, getRequiredString(args, "id"));
    },
    list_shared_step_references: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const target = getOptionalString(args, "target") ?? "workItems";
      if (target !== "workItems" && target !== "sections") {
        throw new Error('"target" must be "workItems" or "sections".');
      }
      return api.searchSharedStepReferences(client, getRequiredString(args, "id"), target, pickPagination(args));
    },
    get_work_item_test_results_history: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkItemTestResultsHistory(client, getRequiredString(args, "id"), {
        from: getOptionalString(args, "from"),
        to: getOptionalString(args, "to"),
        configurationIds: getOptionalStringArray(args, "configurationIds"),
        testPlanIds: getOptionalStringArray(args, "testPlanIds"),
        testRunIds: getOptionalStringArray(args, "testRunIds"),
        statusCodes: getOptionalStringArray(args, "statusCodes"),
        ...pickPagination(args),
      });
    },
  };

  return { tools, handlers };
}
