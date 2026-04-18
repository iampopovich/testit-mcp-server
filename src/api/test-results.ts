import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function getTestResult(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testResults/${id}`);
}

export function searchTestResults(
  client: TestITApiClient,
  query: Record<string, unknown>,
  queryParams: QueryParams,
): Promise<unknown> {
  return client.post("/api/v2/testResults/search", query, queryParams);
}

export function updateTestResult(
  client: TestITApiClient,
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put(`/api/v2/testResults/${id}`, payload);
}
