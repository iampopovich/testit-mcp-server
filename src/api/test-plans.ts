import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export type TestPlanStateAction = "start" | "pause" | "complete";

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

/** POST /testPlans/{id}/start|pause|complete */
export function changeTestPlanState(
  client: TestITApiClient,
  id: string,
  action: TestPlanStateAction,
): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/${action}`);
}

export function cloneTestPlan(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/clone`);
}

export function restoreTestPlan(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/restore`);
}

export function purgeTestPlan(client: TestITApiClient, id: string): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/purge`);
}

export function listTestPlanTestRuns(
  client: TestITApiClient,
  id: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}/testRuns`, query);
}

/** Points selected by explicit ids; an empty selection would hit ALL points of the plan. */
function selectPoints(testPointIds: string[]): Record<string, unknown> {
  return { extractionModel: { ids: { include: testPointIds } } };
}

export function assignTestPointsTester(
  client: TestITApiClient,
  id: string,
  userId: string,
  testPointIds: string[],
): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/testPoints/tester/${userId}`, selectPoints(testPointIds));
}

export function unassignTestPointsTester(
  client: TestITApiClient,
  id: string,
  testPointIds: string[],
): Promise<unknown> {
  return client.delete(`/api/v2/testPlans/${id}/testPoints/tester`, undefined, selectPoints(testPointIds));
}

export function resetTestPoints(client: TestITApiClient, id: string, testPointIds: string[]): Promise<unknown> {
  return client.post(`/api/v2/testPlans/${id}/testPoints/reset`, testPointIds);
}

export function getTestPlanSummary(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}/summaries`);
}

export function listTestPlanConfigurations(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}/configurations`);
}

export function getTestPlanHistory(client: TestITApiClient, id: string, query: QueryParams): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}/history`, query);
}
