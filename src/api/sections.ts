import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;

export interface SectionShort {
  id: string;
  name: string;
  parentId: string | null;
  isDeleted?: boolean;
}

export function listSections(
  client: TestITApiClient,
  projectId: string,
  query: QueryParams,
): Promise<SectionShort[]> {
  return client.get(`/api/v2/projects/${projectId}/sections`, query);
}

export function getSection(
  client: TestITApiClient,
  id: string,
  query: QueryParams = {},
): Promise<SectionShort & Record<string, unknown>> {
  return client.get(`/api/v2/sections/${id}`, query);
}

export function createSection(
  client: TestITApiClient,
  body: Record<string, unknown>,
): Promise<unknown> {
  return client.post("/api/v2/sections", body);
}

export function renameSection(client: TestITApiClient, id: string, name: string): Promise<unknown> {
  return client.post("/api/v2/sections/rename", { id, name });
}

export function moveSection(
  client: TestITApiClient,
  body: { id: string; oldParentId: string; parentId: string; nextSectionId?: string },
): Promise<unknown> {
  return client.post("/api/v2/sections/move", body);
}

/**
 * Archives a section with its children and work items. The endpoint is marked
 * deprecated in the spec but has no replacement (verified on TestIT v2 API).
 */
export function deleteSection(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/sections/${id}`);
}
