import type { TestITApiClient } from "../client.js";
import * as api from "../api/attachments.js";
import type { ToolBundle } from "./types.js";
import { asObject, getRequiredString } from "./utils.js";

const idOnly = {
  type: "object" as const,
  properties: { id: { type: "string", description: "Attachment UUID." } },
  required: ["id"],
};

export function createAttachmentTools(client: TestITApiClient): ToolBundle {
  const tools = [
    {
      name: "upload_attachment",
      description:
        "Upload a file to TestIT and get its attachment id/metadata. Pass the id in attachmentIds of " +
        "create_work_item to attach it.",
      inputSchema: {
        type: "object" as const,
        properties: {
          filename: { type: "string", description: "File name including extension." },
          contentType: { type: "string", description: "MIME type, e.g. image/png." },
          contentBase64: { type: "string", description: "File content encoded as base64." },
        },
        required: ["filename", "contentType", "contentBase64"],
      },
    },
    {
      name: "get_attachment",
      description: "Download an attachment; content is returned base64-encoded.",
      inputSchema: idOnly,
    },
    {
      name: "get_attachment_metadata",
      description: "Attachment metadata: name, type, size, author, dates.",
      inputSchema: idOnly,
    },
    {
      name: "delete_attachment",
      description: "Delete an attachment that is not linked to any entity (TestIT returns 422 for linked ones).",
      inputSchema: idOnly,
    },
  ];

  const handlers = {
    upload_attachment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.uploadAttachment(
        client,
        getRequiredString(args, "filename"),
        getRequiredString(args, "contentType"),
        getRequiredString(args, "contentBase64"),
      );
    },
    get_attachment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.downloadAttachment(client, getRequiredString(args, "id"));
    },
    get_attachment_metadata: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.getAttachmentMetadata(client, getRequiredString(args, "id"));
    },
    delete_attachment: async (rawArgs: unknown) => {
      const args = asObject(rawArgs);
      return api.deleteAttachment(client, getRequiredString(args, "id"));
    },
  };

  return { tools, handlers };
}
