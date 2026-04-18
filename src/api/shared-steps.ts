import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listSharedSteps(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/workItems`, {
    ...query,
    entityTypes: ["SharedSteps"],
  });
}

export function getSharedStep(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}`);
}
