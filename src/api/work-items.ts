import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

/**
 * Search work items inside a project (replaces deprecated
 * GET /projects/{projectId}/workItems). Body: { filter, extractionModel? }.
 */
export function searchProjectWorkItems(
  client: TestITApiClient,
  projectId: string,
  filter: Record<string, unknown>,
  query: QueryParams,
): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/workItems/search`, { filter }, query);
}

export function searchWorkItems(
  client: TestITApiClient,
  query: Record<string, unknown>,
  queryParams: QueryParams,
): Promise<unknown> {
  return client.post("/api/v2/workItems/search", query, queryParams);
}

export function getWorkItem(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}`);
}

export function createWorkItem(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/workItems", payload);
}

export function updateWorkItem(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put("/api/v2/workItems", payload);
}

export function deleteWorkItem(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/workItems/${id}`);
}

export function getWorkItemHistory(
  client: TestITApiClient,
  id: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}/history`, query);
}

export function getWorkItemVersions(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}/versions`);
}

export function restoreWorkItem(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/workItems/${id}/restore`);
}

export function purgeWorkItem(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/workItems/${id}/purge`);
}

export async function uploadWorkItemAttachment(
  client: TestITApiClient,
  id: string,
  filename: string,
  contentType: string,
  contentBase64: string,
): Promise<unknown> {
  const buffer = Buffer.from(contentBase64, "base64");
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, filename);
  return client.postMultipart(`/api/v2/workItems/${id}/attachments`, formData);
}

/** JSON Patch; every successful patch creates a new work item version. */
export function patchWorkItem(
  client: TestITApiClient,
  id: string,
  operations: Array<Record<string, unknown>>,
): Promise<unknown> {
  return client.patch(`/api/v2/workItems/${id}`, operations);
}

export function moveWorkItem(client: TestITApiClient, body: Record<string, unknown>): Promise<unknown> {
  return client.post("/api/v2/workItems/move", body);
}

export function listWorkItemComments(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}/comments`);
}

export function createWorkItemComment(client: TestITApiClient, workItemId: string, text: string): Promise<unknown> {
  return client.post("/api/v2/workItems/comments", { workItemId, text });
}

export function updateWorkItemComment(client: TestITApiClient, id: string, text: string): Promise<unknown> {
  return client.put("/api/v2/workItems/comments", { id, text });
}

export function deleteWorkItemComment(client: TestITApiClient, commentId: string): Promise<unknown> {
  return client.delete(`/api/v2/workItems/comments/${commentId}`);
}

export function getWorkItemTestResultsHistory(
  client: TestITApiClient,
  id: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}/testResults/history`, query);
}

export function listWorkItemAutoTests(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}/autoTests`);
}

/** Removes ALL autotest links of the work item (it becomes manual). */
export function unlinkWorkItemAutoTests(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/workItems/${id}/autoTests`);
}

export function searchSharedStepReferences(
  client: TestITApiClient,
  sharedStepId: string,
  target: "workItems" | "sections",
  query: QueryParams,
): Promise<unknown> {
  return client.post(`/api/v2/workItems/${sharedStepId}/references/${target}`, {}, query);
}
