import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listProjects(client: TestITApiClient, query: QueryParams): Promise<unknown> {
  return client.get("/api/v2/projects", query);
}

export function searchProjects(
  client: TestITApiClient,
  query: Record<string, unknown>,
  queryParams: QueryParams,
): Promise<unknown> {
  return client.post("/api/v2/projects/search", query, queryParams);
}

export function getProject(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/projects/${id}`);
}

export function createProject(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/projects", payload);
}

export function updateProject(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put("/api/v2/projects", payload);
}

export function deleteProject(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/projects/${id}`);
}
