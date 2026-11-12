import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

/** POST /testStatuses/search returns { data: [...], totalCount } (not a plain array). */
export function searchTestStatuses(
  client: TestITApiClient,
  body: Record<string, unknown>,
): Promise<{ data: unknown[]; totalCount: number }> {
  return client.post("/api/v2/testStatuses/search", body);
}

export function searchTags(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/tags/search", query);
}

export function listProjectWorkItemTags(client: TestITApiClient, projectId: string): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/workItems/tags`);
}

export function listTestPlanTags(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/tags/testPlansTags", query);
}

export function listProjectAttributes(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/attributes`, query);
}
