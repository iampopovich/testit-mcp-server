import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function getProjectTestPlansWithAnalytics(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/testPlans/analytics`, query);
}

export function getTestPlanAnalytics(
  client: TestITApiClient,
  id: string,
): Promise<unknown> {
  return client.get(`/api/v2/testPlans/${id}/analytics`);
}

export function getTestRunStatistics(
  client: TestITApiClient,
  id: string,
  filter: Record<string, unknown> = {},
): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${id}/statistics/filter`, filter);
}
