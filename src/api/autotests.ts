import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function searchAutoTests(
  client: TestITApiClient,
  body: { filter: Record<string, unknown>; includes?: Record<string, unknown> },
  query: QueryParams,
): Promise<unknown> {
  return client.post("/api/v2/autoTests/search", body, query);
}

export function getAutoTest(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/autoTests/${id}`);
}

export function createAutoTest(client: TestITApiClient, body: Record<string, unknown>): Promise<unknown> {
  return client.post("/api/v2/autoTests", body);
}

/** Hard delete: the autotest is gone afterwards (GET returns 404). */
export function deleteAutoTest(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/autoTests/${id}`);
}

export function listAutoTestWorkItems(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/autoTests/${id}/workItems`);
}

export function linkAutoTestWorkItem(client: TestITApiClient, id: string, workItemId: string): Promise<unknown> {
  return client.post(`/api/v2/autoTests/${id}/workItems`, { id: workItemId });
}

export function unlinkAutoTestWorkItem(client: TestITApiClient, id: string, workItemId: string): Promise<unknown> {
  return client.delete(`/api/v2/autoTests/${id}/workItems`, { workItemId });
}
