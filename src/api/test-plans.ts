import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listTestPlans(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/testPlans`, query);
}

export function getTestPlan(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}`);
}

export function createTestPlan(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/testPlans", payload);
}

export function updateTestPlan(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put("/api/v2/testPlans", payload);
}

export function deleteTestPlan(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/testPlans/${id}`);
}
