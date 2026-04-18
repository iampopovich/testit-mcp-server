import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listConfigurations(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/configurations`, query);
}

export function getConfiguration(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/configurations/${id}`);
}

export function createConfiguration(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/configurations", payload);
}

export function updateConfiguration(
  client: TestITApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return client.put("/api/v2/configurations", payload);
}
