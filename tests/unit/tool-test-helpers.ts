import { expect, vi } from "vitest";
import type { ToolBundle } from "../../src/tools/types.js";

export interface RecordedCall {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

export interface RecordingClient {
  defaultProjectId?: string;
  calls: RecordedCall[];
  responses: Map<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  postMultipart: ReturnType<typeof vi.fn>;
  getRaw: ReturnType<typeof vi.fn>;
}

/**
 * Fake TestITApiClient that records every HTTP call made by api/* wrappers.
 * Responses can be preset per "METHOD path" key; default response is [].
 */
export function createRecordingClient(defaultProjectId?: string): RecordingClient {
  const calls: RecordedCall[] = [];
  const responses = new Map<string, unknown>();
  const respond = (method: RecordedCall["method"], path: string) =>
    responses.has(`${method} ${path}`) ? responses.get(`${method} ${path}`) : [];

  return {
    defaultProjectId,
    calls,
    responses,
    get: vi.fn(async (path: string, query?: Record<string, unknown>) => {
      calls.push({ method: "GET", path, query });
      return respond("GET", path);
    }),
    post: vi.fn(async (path: string, body?: unknown, query?: Record<string, unknown>) => {
      calls.push({ method: "POST", path, body, query });
      return respond("POST", path);
    }),
    put: vi.fn(async (path: string, body?: unknown, query?: Record<string, unknown>) => {
      calls.push({ method: "PUT", path, body, query });
      return respond("PUT", path);
    }),
    patch: vi.fn(async (path: string, body?: unknown, query?: Record<string, unknown>) => {
      calls.push({ method: "PATCH", path, body, query });
      return respond("PATCH", path);
    }),
    delete: vi.fn(async (path: string, query?: Record<string, unknown>, body?: unknown) => {
      calls.push({ method: "DELETE", path, body, query });
      return respond("DELETE", path);
    }),
    postMultipart: vi.fn(async (path: string, _form: unknown, query?: Record<string, unknown>) => {
      calls.push({ method: "POST", path, query });
      return respond("POST", path);
    }),
    getRaw: vi.fn(async (path: string, query?: Record<string, unknown>) => {
      calls.push({ method: "GET", path, query });
      return { contentType: "application/octet-stream", content: "", encoding: "base64" };
    }),
  };
}

export function expectToolHandlerParity(bundle: ToolBundle): void {
  const toolNames = bundle.tools.map((tool) => tool.name);
  const handlerNames = Object.keys(bundle.handlers);

  expect(new Set(toolNames).size).toBe(toolNames.length);
  expect(new Set(handlerNames).size).toBe(handlerNames.length);
  expect([...handlerNames].sort()).toEqual([...toolNames].sort());
}

export function expectObjectSchemas(bundle: ToolBundle): void {
  for (const tool of bundle.tools) {
    expect(tool.inputSchema.type).toBe("object");
    const properties = tool.inputSchema.properties ?? {};
    for (const key of tool.inputSchema.required ?? []) {
      expect(Object.prototype.hasOwnProperty.call(properties, key), `${tool.name}.${key}`).toBe(true);
    }
  }
}

/** Remove undefined/null values so assertions only see what reaches the wire. */
export function definedQuery(query?: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== null),
  );
}

export const SAMPLE_UUID = "00000000-0000-0000-0000-000000000001";

/** Builds minimal valid args for a tool from its inputSchema. */
export function sampleArgs(schema: {
  properties?: Record<string, unknown>;
  required?: string[];
}): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const properties = (schema.properties ?? {}) as Record<string, { type?: string; enum?: unknown[] }>;
  for (const key of schema.required ?? []) {
    const prop = properties[key] ?? {};
    if (prop.enum && prop.enum.length > 0) {
      args[key] = prop.enum[0];
      continue;
    }
    switch (prop.type) {
      case "number":
      case "integer":
        args[key] = 1;
        break;
      case "boolean":
        args[key] = true;
        break;
      case "object":
        args[key] = {};
        break;
      case "array":
        args[key] = [SAMPLE_UUID];
        break;
      default:
        args[key] = key === "contentBase64" ? "aGVsbG8=" : SAMPLE_UUID;
    }
  }
  if ("projectId" in properties && args.projectId === undefined) {
    args.projectId = SAMPLE_UUID;
  }
  return args;
}
