import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listTestRuns(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/testRuns`, query);
}

export function getTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testRuns/${id}`);
}

export function createTestRun(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/testRuns", payload);
}

export function startTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/start`);
}

export function stopTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/stop`);
}

export function completeTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/complete`);
}

/** Create a run inside a test plan from automated work items x configurations. */
export function createTestRunByWorkItems(
  client: TestITApiClient,
  body: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/testRuns/byWorkItems", body);
}

export function deleteTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/testRuns/${id}`);
}

export function restoreTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/restore`);
}

export function purgeTestRun(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/purge`);
}

export function getTestRunTestResults(
  client: TestITApiClient,
  id: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/testRuns/${id}/testPoints/results`, query);
}
