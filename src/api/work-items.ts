import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listWorkItems(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/workItems`, query);
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
