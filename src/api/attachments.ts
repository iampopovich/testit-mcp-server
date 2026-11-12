import type { TestITApiClient } from "../client.js";

/** Standalone upload; reference the returned id in "attachments" of work items, sections etc. */
export function uploadAttachment(
  client: TestITApiClient,
  filename: string,
  contentType: string,
  contentBase64: string,
): Promise<unknown> {
  const blob = new Blob([Buffer.from(contentBase64, "base64")], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, filename);
  return client.postMultipart("/api/v2/attachments", formData);
}

export function downloadAttachment(
  client: TestITApiClient,
  id: string,
): Promise<{ contentType: string; content: string; encoding: string }> {
  return client.getRaw(`/api/v2/attachments/${id}`);
}

export function getAttachmentMetadata(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/attachments/${id}/metadata`);
}

export function deleteAttachment(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/attachments/${id}`);
}
