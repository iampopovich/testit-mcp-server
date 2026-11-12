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

/** RFC 6902 JSON Patch of a single test result. */
export function patchTestResult(
  client: TestITApiClient,
  id: string,
  operations: Array<Record<string, unknown>>,
): Promise<unknown> {
  return client.patch(`/api/v2/testResults/${id}`, operations);
}

export function submitTestRunResults(
  client: TestITApiClient,
  testRunId: string,
  results: Array<Record<string, unknown>>,
): Promise<unknown> {
  return client.post(`/api/v2/testRuns/${testRunId}/testResults`, results);
}

export function listTestResultAttachments(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/testResults/${id}/attachments`);
}

/** Multipart upload; TestIT responds with the new attachment id as a bare JSON string. */
export function uploadTestResultAttachment(
  client: TestITApiClient,
  id: string,
  filename: string,
  contentType: string,
  contentBase64: string,
): Promise<unknown> {
  const blob = new Blob([Buffer.from(contentBase64, "base64")], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, filename);
  return client.postMultipart(`/api/v2/testResults/${id}/attachments`, formData);
}

export function downloadTestResultAttachment(
  client: TestITApiClient,
  id: string,
  attachmentId: string,
): Promise<{ contentType: string; content: string; encoding: string }> {
  return client.getRaw(`/api/v2/testResults/${id}/attachments/${attachmentId}`);
}

export function deleteTestResultAttachment(
  client: TestITApiClient,
  id: string,
  attachmentId: string,
): Promise<unknown> {
  return client.delete(`/api/v2/testResults/${id}/attachments/${attachmentId}`);
}
