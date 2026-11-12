import type { TestITApiClient } from "../client.js";

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined | null>;
type Body = Record<string, unknown>;

// Global and generic custom attributes
export function searchCustomAttributes(client: TestITApiClient, filter: Body, query: QueryParams): Promise<unknown> {
  return client.post("/api/v2/customAttributes/search", filter, query);
}

export function getCustomAttribute(client: TestITApiClient, id: string): Promise<Body> {
  return client.get(`/api/v2/customAttributes/${id}`);
}

export function createGlobalAttribute(client: TestITApiClient, body: Body): Promise<unknown> {
  return client.post("/api/v2/customAttributes/global", body);
}

export function updateGlobalAttribute(client: TestITApiClient, id: string, body: Body): Promise<unknown> {
  return client.put(`/api/v2/customAttributes/global/${id}`, body);
}

/** Archives the attribute everywhere; the API has no restore/purge for attributes. */
export function deleteGlobalAttribute(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/customAttributes/global/${id}`);
}

// Project attributes
export function linkProjectGlobalAttributes(
  client: TestITApiClient,
  projectId: string,
  attributeIds: string[],
): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/globalAttributes`, attributeIds);
}

export function getProjectAttribute(client: TestITApiClient, projectId: string, id: string): Promise<Body> {
  return client.get(`/api/v2/projects/${projectId}/attributes/${id}`);
}

export function createProjectAttribute(client: TestITApiClient, projectId: string, body: Body): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/attributes`, body);
}

export function updateProjectAttribute(client: TestITApiClient, projectId: string, body: Body): Promise<unknown> {
  return client.put(`/api/v2/projects/${projectId}/attributes`, body);
}

/** Project attribute -> archived; global attribute -> only detached from the project. */
export function deleteProjectAttribute(client: TestITApiClient, projectId: string, id: string): Promise<unknown> {
  return client.delete(`/api/v2/projects/${projectId}/attributes/${id}`);
}

// Test plan attributes of a project
export function listTestPlanAttributes(client: TestITApiClient, projectId: string): Promise<unknown> {
  return client.get(`/api/v2/projects/${projectId}/testPlans/attributes`);
}

export function linkTestPlanAttributes(client: TestITApiClient, projectId: string, ids: string[]): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/testPlans/attributes`, ids);
}

export function updateTestPlanAttribute(client: TestITApiClient, projectId: string, body: Body): Promise<unknown> {
  return client.put(`/api/v2/projects/${projectId}/testPlans/attributes`, body);
}

export function unlinkTestPlanAttribute(client: TestITApiClient, projectId: string, id: string): Promise<unknown> {
  return client.delete(`/api/v2/projects/${projectId}/testPlans/attributes/${id}`);
}

// Attribute templates
export function searchAttributeTemplates(client: TestITApiClient, filter: Body, query: QueryParams): Promise<unknown> {
  return client.post("/api/v2/customAttributes/templates/search", filter, query);
}

export function createAttributeTemplate(client: TestITApiClient, body: Body): Promise<unknown> {
  return client.post("/api/v2/customAttributes/templates", body);
}

export function deleteAttributeTemplate(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/customAttributes/templates/${id}`);
}

export function includeTemplateAttributes(client: TestITApiClient, id: string, ids: string[]): Promise<unknown> {
  return client.post(`/api/v2/customAttributes/templates/${id}/customAttributes/include`, ids);
}

export function excludeTemplateAttributes(client: TestITApiClient, id: string, ids: string[]): Promise<unknown> {
  return client.post(`/api/v2/customAttributes/templates/${id}/customAttributes/exclude`, ids);
}

export function listProjectAttributeTemplates(client: TestITApiClient, projectId: string): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/attributes/templates/search`, {});
}

export function linkProjectAttributeTemplate(client: TestITApiClient, projectId: string, id: string): Promise<unknown> {
  return client.post(`/api/v2/projects/${projectId}/attributes/templates/${id}`);
}

export function unlinkProjectAttributeTemplate(
  client: TestITApiClient,
  projectId: string,
  id: string,
): Promise<unknown> {
  return client.delete(`/api/v2/projects/${projectId}/attributes/templates/${id}`);
}
