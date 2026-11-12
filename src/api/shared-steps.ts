import type { TestITApiClient } from "../client.js";
import { searchProjectWorkItems } from "./work-items.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export function listSharedSteps(
  client: TestITApiClient,
  projectId: string,
  filter: Record<string, unknown>,
  query: QueryParams,
): Promise<unknown> {
  return searchProjectWorkItems(client, projectId, { ...filter, types: ["SharedSteps"] }, query);
}

export function getSharedStep(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/workItems/${id}`);
}
