import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listTestPlanTestSuites(client: TestITApiClient, testPlanId: string): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${testPlanId}/testSuites`);
}

export function getTestSuite(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testSuites/${id}`);
}

export function createTestSuite(client: TestITApiClient, body: Record<string, unknown>): Promise<unknown> {
  return client.post("/api/v2/testSuites", body);
}

export function deleteTestSuite(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/testSuites/${id}`);
}

/** Replaces the suite's work items (test points are regenerated). */
export function setTestSuiteWorkItems(client: TestITApiClient, id: string, workItemIds: string[]): Promise<unknown> {
  return client.post(`/api/v2/testSuites/${id}/workItems`, workItemIds);
}

export function setTestSuiteConfigurations(
  client: TestITApiClient,
  id: string,
  configurationIds: string[],
): Promise<unknown> {
  return client.post(`/api/v2/testSuites/${id}/configurations`, configurationIds);
}

export function listTestSuiteTestPoints(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testSuites/${id}/testPoints`);
}

export function searchTestPoints(
  client: TestITApiClient,
  filter: Record<string, unknown>,
  query: QueryParams,
): Promise<unknown> {
  return client.post("/api/v2/testPoints/search", filter, query);
}

export function patchTestSuite(
  client: TestITApiClient,
  id: string,
  operations: Array<Record<string, unknown>>,
): Promise<unknown> {
  return client.patch(`/api/v2/testSuites/${id}`, operations);
}

export function listTestSuiteTestResults(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testSuites/${id}/testResults`);
}

export function listTestSuiteConfigurations(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testSuites/${id}/configurations`);
}

export function getTestPointWorkItem(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testPoints/${id}/workItem`);
}

export function listTestPointTestRuns(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testPoints/${id}/testRuns`);
}
