import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;
type Body = Record<string, unknown>;

// Webhooks
export function searchWebhooks(client: TestITApiClient, filter: Body, query: QueryParams): Promise<unknown> {
  return client.post("/api/v2/webhooks/search", filter, query);
}

export function getWebhook(client: TestITApiClient, id: string): Promise<Body> {
  return client.get(`/api/v2/webhooks/${id}`);
}

export function createWebhook(client: TestITApiClient, body: Body): Promise<unknown> {
  return client.post("/api/v2/webhooks", body);
}

/** PUT with the full WebHookPostModel. */
export function updateWebhook(client: TestITApiClient, id: string, body: Body): Promise<unknown> {
  return client.put(`/api/v2/webhooks/${id}`, body);
}

/** Hard delete (GET returns 404 afterwards). */
export function deleteWebhook(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/webhooks/${id}`);
}

export function listWebhookVariables(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/webhooks/specialVariables", query);
}

export function testWebhookUrl(client: TestITApiClient, body: Body): Promise<unknown> {
  return client.post("/api/v2/webhooks/test", body);
}

export function listWebhookLogs(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/webhooks/logs", query);
}

// Workflows (read-only: creating/changing them needs the custom statuses feature)
export function searchWorkflows(client: TestITApiClient): Promise<{ data?: unknown[] }> {
  return client.post("/api/v2/workflows/search", {});
}

export function getWorkflow(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workflows/${id}`);
}

export function listWorkflowProjects(client: TestITApiClient, id: string): Promise<{ data?: unknown[] }> {
  return client.post(`/api/v2/workflows/${id}/projects/search`, {});
}

// Notifications of the current user
export function searchNotifications(client: TestITApiClient, filter: Body, query: QueryParams): Promise<unknown> {
  return client.post("/api/v2/notifications/search", filter, query);
}

export function countNotifications(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/notifications/count", query);
}

export function markNotificationRead(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/notifications/${id}/read`);
}

export function markAllNotificationsRead(client: TestITApiClient): Promise<unknown> {
  return client.post("/api/v2/notifications/read");
}

// Project autotest settings
export function getProjectAutoTestSettings(client: TestITApiClient, projectId: string): Promise<Body> {
  return client.get(`/api/v2/projects/${projectId}/settings/autotests`);
}

/** Full replacement of the settings model. */
export function saveProjectAutoTestSettings(client: TestITApiClient, projectId: string, body: Body): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/settings/autotests`, body);
}

// Background jobs of the current user (exports/imports/purges started in the UI)
export function searchBackgroundJobs(client: TestITApiClient, filter: Body, query: QueryParams): Promise<unknown> {
  return client.post("/api/v2/backgroundJobs/search", filter, query);
}
