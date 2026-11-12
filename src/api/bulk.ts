import type { TestITApiClient } from "../client.js";

type Body = Record<string, unknown>;

/** Selection by explicit ids; filter is required by some endpoints but only narrows by project here. */
function select(ids: string[], filter: Body): Body {
  return { extractionModel: { ids: { include: ids } }, filter };
}

// Test runs (responses: number of affected runs)
export function deleteTestRuns(client: TestITApiClient, projectId: string, ids: string[]): Promise<unknown> {
  return client.delete("/api/v2/testRuns", undefined, select(ids, { projectIds: [projectId] }));
}

export function restoreTestRuns(client: TestITApiClient, projectId: string, ids: string[]): Promise<unknown> {
  return client.post("/api/v2/testRuns/restore/bulk", select(ids, { projectIds: [projectId] }));
}

export function purgeTestRuns(client: TestITApiClient, projectId: string, ids: string[]): Promise<unknown> {
  return client.post("/api/v2/testRuns/purge/bulk", select(ids, { projectIds: [projectId] }));
}

export function updateTestRuns(
  client: TestITApiClient,
  projectId: string,
  ids: string[],
  changes: Body,
): Promise<unknown> {
  return client.post("/api/v2/testRuns/updateMultiple", {
    selectModel: select(ids, { projectIds: [projectId] }),
    ...changes,
  });
}

// Test plans of a project (delete/restore respond with affected ids)
export function bulkTestPlans(
  client: TestITApiClient,
  projectId: string,
  action: "delete" | "restore" | "purge",
  ids: string[],
): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/testPlans/${action}/bulk`, select(ids, {}));
}

// Configurations (responses: number of affected configurations)
export function bulkConfigurations(
  client: TestITApiClient,
  projectId: string,
  action: "delete" | "restore" | "purge",
  ids: string[],
): Promise<unknown> {
  return client.post(`/api/v2/configurations/${action}/bulk`, select(ids, { projectIds: [projectId] }));
}

// Autotests (archive; response {deletedCount, inProgressCount})
export function deleteAutoTests(client: TestITApiClient, projectId: string, ids: string[]): Promise<unknown> {
  return client.delete("/api/v2/autoTests", undefined, {
    autoTestSelect: select(ids, { projectIds: [projectId] }),
  });
}
