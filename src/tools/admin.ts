import type { TestITApiClient } from "../client.js";
import * as api from "../api/admin.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalBoolean,
  getOptionalNumber,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredString,
  PAGINATION_PROPERTIES,
  pickPagination,
  resolveProjectId,
  type ToolArgs,
} from "./utils.js";

const EVENT_TYPES = [
  "AutomatedTestRunCreated",
  "TestPlansStatusChanged",
  "TestRunStopped",
  "TestPointAssigned",
  "TestResultJiraIssueCreated",
  "AutoTestFinished",
  "UserMentionedInComment",
  "UserSelectedInWorkItemAttribute",
  "AllTestPointsFinished",
  "AllAutoTestsFinished",
  "AutoTestChanged",
  "WorkItemAutoTestRelationChanged",
  "WorkItemAttributeChanged",
  "WorkItemChanged",
  "ConfigurationChanged",
  "ProjectChanged",
  "TestPlanChanged",
] as const;
const REQUEST_TYPES = ["Post", "Put", "Delete"] as const;
const NOTIFICATION_TYPES = [
  "MentionInComment",
  "TestPointIsSetInTestPlan",
  "MentionInCustomAttribute",
  "TestPlanUnlockRequest",
] as const;

const compact = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const PROJECT = {
  projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
  projectName: { type: "string" },
} as const;

const WEBHOOK_FIELDS = {
  name: { type: "string" },
  eventType: { type: "string", enum: [...EVENT_TYPES] },
  url: { type: "string" },
  requestType: { type: "string", enum: [...REQUEST_TYPES], description: "HTTP method, default Post." },
  isEnabled: { type: "boolean", description: "Default true." },
  description: { type: "string" },
  headers: { type: "object", additionalProperties: { type: "string" } },
  queryParameters: { type: "object", additionalProperties: { type: "string" } },
  shouldSendBody: { type: "boolean", description: "Send TestIT's default JSON body (default true)." },
  customBody: { type: "string", description: "Custom body; may contain variables from list_webhook_variables." },
  shouldReplaceParameters: { type: "boolean", description: "Substitute $VARIABLES in url/headers/body." },
  shouldEscapeParameters: { type: "boolean" },
} as const;

/** Webhook defaults made explicit: TestIT's own defaults disable the hook and omit the body. */
const WEBHOOK_DEFAULTS = {
  requestType: "Post",
  isEnabled: true,
  headers: {},
  queryParameters: {},
  shouldSendBody: true,
  shouldSendCustomBody: false,
  shouldReplaceParameters: false,
  shouldEscapeParameters: false,
};

function webhookChanges(args: ToolArgs): Record<string, unknown> {
  const customBody = getOptionalString(args, "customBody");
  return compact({
    name: getOptionalString(args, "name"),
    eventType: getOptionalString(args, "eventType"),
    url: getOptionalString(args, "url"),
    requestType: getOptionalString(args, "requestType"),
    isEnabled: getOptionalBoolean(args, "isEnabled"),
    description: getOptionalString(args, "description"),
    headers: getOptionalObjectPayload(args, "headers"),
    queryParameters: getOptionalObjectPayload(args, "queryParameters"),
    shouldSendBody: getOptionalBoolean(args, "shouldSendBody"),
    customBody,
    shouldSendCustomBody: customBody !== undefined ? true : undefined,
    shouldReplaceParameters: getOptionalBoolean(args, "shouldReplaceParameters"),
    shouldEscapeParameters: getOptionalBoolean(args, "shouldEscapeParameters"),
  });
}

const WEBHOOK_MODEL_KEYS = [
  "projectId",
  "name",
  "eventType",
  "url",
  "requestType",
  "isEnabled",
  "description",
  "headers",
  "queryParameters",
  "shouldSendBody",
  "shouldSendCustomBody",
  "customBody",
  "shouldReplaceParameters",
  "shouldEscapeParameters",
];

const AUTOTEST_SETTING_FIELDS = {
  rerunEnabled: { type: "boolean" },
  rerunAttemptsCount: { type: "integer" },
  isFlakyAuto: { type: "boolean" },
  flakyStabilityPercentage: { type: "integer" },
  flakyTestRunCount: { type: "integer" },
  workItemUpdatingEnabled: { type: "boolean", description: "Update linked work items from autotest results." },
  archiveOutdatedTestRunsEnabled: { type: "boolean" },
  testRunsArchiveLimitEnabled: { type: "boolean" },
  testRunsRetentionPeriodDays: { type: "integer" },
  maxActiveTestRunsCount: { type: "integer" },
} as const;

const idProp = (description: string) => ({ id: { type: "string", description } });

/** Opt-in admin toolset: webhooks, workflows (read), notifications, project autotest settings. */
export function createAdminTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "search_webhooks",
      description: "Search webhooks (default: current project).",
      inputSchema: {
        type: "object" as const,
        properties: {
          ...PROJECT,
          name: { type: "string" },
          eventTypes: { type: "array", items: { type: "string", enum: [...EVENT_TYPES] } },
          isEnabled: { type: "boolean" },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_webhook",
      description: "Get a webhook by id.",
      inputSchema: { type: "object" as const, properties: idProp("Webhook UUID."), required: ["id"] },
    },
    {
      name: "create_webhook",
      description:
        "Create a project webhook fired on eventType. Defaults: Post, enabled, TestIT JSON body. Passing customBody " +
        "sends it instead of the default body.",
      inputSchema: {
        type: "object" as const,
        properties: { ...PROJECT, ...WEBHOOK_FIELDS },
        required: ["name", "eventType", "url"],
      },
    },
    {
      name: "set_webhook",
      description: "Change some fields of a webhook (e.g. isEnabled=false to pause it); other fields are kept.",
      inputSchema: {
        type: "object" as const,
        properties: { ...idProp("Webhook UUID."), ...WEBHOOK_FIELDS },
        required: ["id"],
      },
    },
    {
      name: "delete_webhook",
      description: "Delete a webhook permanently.",
      inputSchema: { type: "object" as const, properties: idProp("Webhook UUID."), required: ["id"] },
    },
    {
      name: "list_webhook_variables",
      description: "Variables ($TEST_PLAN_NAME, ...) available for an event type, for url or body templates.",
      inputSchema: {
        type: "object" as const,
        properties: {
          eventType: { type: "string", enum: [...EVENT_TYPES] },
          variablesType: { type: "string", description: "VariablesForUrl (default) or VariablesForBody." },
        },
        required: ["eventType"],
      },
    },
    {
      name: "submit_webhook_test",
      description: "Send a test request from TestIT to a URL and return the HTTP response it got.",
      inputSchema: {
        type: "object" as const,
        properties: { url: { type: "string" }, requestType: { type: "string", enum: [...REQUEST_TYPES] } },
        required: ["url"],
      },
    },
    {
      name: "list_webhook_logs",
      description: "Recent webhook calls of a project (request, response, status).",
      inputSchema: { type: "object" as const, properties: { ...PROJECT, ...PAGINATION_PROPERTIES } },
    },
    {
      name: "list_workflows",
      description:
        "Workflows (sets of test statuses) with the projects using them. Read-only here: creating workflows needs " +
        "the custom statuses feature of the TestIT plan.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "get_workflow",
      description: "A workflow with its statuses (code, type, priority).",
      inputSchema: { type: "object" as const, properties: idProp("Workflow UUID."), required: ["id"] },
    },
    {
      name: "list_workflow_projects",
      description: "Projects that use a workflow.",
      inputSchema: { type: "object" as const, properties: idProp("Workflow UUID."), required: ["id"] },
    },
    {
      name: "search_notifications",
      description: "Notifications of the current user (mentions, assigned test points, ...).",
      inputSchema: {
        type: "object" as const,
        properties: {
          isRead: { type: "boolean" },
          types: { type: "array", items: { type: "string", enum: [...NOTIFICATION_TYPES] } },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_notifications_count",
      description: "Number of notifications of the current user in the last 7 days (optionally only unread).",
      inputSchema: { type: "object" as const, properties: { isRead: { type: "boolean" } } },
    },
    {
      name: "set_notifications_read",
      description: "Mark one notification (id) or, without id, ALL notifications of the current user as read.",
      inputSchema: { type: "object" as const, properties: idProp("Notification UUID; omit to mark all.") },
    },
    {
      name: "search_background_jobs",
      description:
        "Background jobs of the current user (exports, imports, purges started in TestIT) with state and progress.",
      inputSchema: {
        type: "object" as const,
        properties: {
          states: {
            type: "array",
            items: { type: "string", enum: ["Enqueued", "InProgress", "Completed", "Failed", "Canceled"] },
          },
          types: { type: "array", items: { type: "string" }, description: "e.g. ExportXlsxTestPointsByTestPlan." },
          ...PAGINATION_PROPERTIES,
        },
      },
    },
    {
      name: "get_project_autotest_settings",
      description: "Autotest settings of a project: reruns, flaky detection, run retention, work item updating.",
      inputSchema: { type: "object" as const, properties: PROJECT },
    },
    {
      name: "set_project_autotest_settings",
      description:
        "Change some autotest settings of a project; others are kept. Some (reruns, flaky thresholds) need a " +
        "paid TestIT feature and fail with 402 otherwise.",
      inputSchema: { type: "object" as const, properties: { ...PROJECT, ...AUTOTEST_SETTING_FIELDS } },
    },
  ];

  const project = (args: ToolArgs) => resolveProjectId(args, client);

  const handlers = {
    search_webhooks: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = compact({
        projectIds: [await project(args)],
        name: getOptionalString(args, "name"),
        eventTypes: getOptionalStringArray(args, "eventTypes"),
        isEnabled: getOptionalBoolean(args, "isEnabled"),
      });
      return api.searchWebhooks(client, filter, pickPagination(args));
    },
    get_webhook: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWebhook(client, getRequiredString(args, "id"));
    },
    create_webhook: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      getRequiredString(args, "name");
      getRequiredString(args, "eventType");
      getRequiredString(args, "url");
      return api.createWebhook(client, { ...WEBHOOK_DEFAULTS, ...webhookChanges(args), projectId: await project(args) });
    },
    set_webhook: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const webhookId = getRequiredString(args, "id");
      const changes = webhookChanges(args);
      if (Object.keys(changes).length === 0) {
        throw new Error("Nothing to update: pass at least one webhook field.");
      }
      const current = (await api.getWebhook(client, webhookId)) ?? {};
      const model = Object.fromEntries(WEBHOOK_MODEL_KEYS.map((key) => [key, current[key]]));
      return api.updateWebhook(client, webhookId, { ...WEBHOOK_DEFAULTS, ...compact(model), ...changes });
    },
    delete_webhook: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteWebhook(client, getRequiredString(args, "id"));
    },
    list_webhook_variables: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listWebhookVariables(client, {
        eventType: getRequiredString(args, "eventType"),
        variablesType: getOptionalString(args, "variablesType"),
      });
    },
    submit_webhook_test: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.testWebhookUrl(client, {
        url: getRequiredString(args, "url"),
        requestType: getOptionalString(args, "requestType") ?? "Post",
      });
    },
    list_webhook_logs: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.listWebhookLogs(client, { projectId: await project(args), ...pickPagination(args) });
    },
    list_workflows: async () => {
      const result = await api.searchWorkflows(client);
      return result?.data ?? [];
    },
    get_workflow: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getWorkflow(client, getRequiredString(args, "id"));
    },
    list_workflow_projects: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const result = await api.listWorkflowProjects(client, getRequiredString(args, "id"));
      return result?.data ?? [];
    },
    search_notifications: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = compact({
        isRead: getOptionalBoolean(args, "isRead"),
        types: getOptionalStringArray(args, "types"),
      });
      return api.searchNotifications(client, filter, pickPagination(args));
    },
    get_notifications_count: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.countNotifications(client, { isRead: getOptionalBoolean(args, "isRead") });
    },
    set_notifications_read: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const notificationId = getOptionalString(args, "id");
      return notificationId ? api.markNotificationRead(client, notificationId) : api.markAllNotificationsRead(client);
    },
    search_background_jobs: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const filter = compact({
        states: getOptionalStringArray(args, "states"),
        types: getOptionalStringArray(args, "types"),
      });
      return api.searchBackgroundJobs(client, filter, pickPagination(args));
    },
    get_project_autotest_settings: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getProjectAutoTestSettings(client, await project(args));
    },
    set_project_autotest_settings: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      const changes = compact(
        Object.fromEntries(
          Object.entries(AUTOTEST_SETTING_FIELDS).map(([key, schema]) => [
            key,
            schema.type === "boolean" ? getOptionalBoolean(args, key) : getOptionalNumber(args, key),
          ]),
        ),
      );
      if (Object.keys(changes).length === 0) {
        throw new Error("Nothing to update: pass at least one setting.");
      }
      const projectId = await project(args);
      const settings: Record<string, unknown> = { ...((await api.getProjectAutoTestSettings(client, projectId)) ?? {}) };
      delete settings.projectId;
      return api.saveProjectAutoTestSettings(client, projectId, { ...settings, ...changes });
    },
  };

  return { tools, handlers };
}
