import type { TestITApiClient } from "../client.js";
export type ToolArgs = Record<string, unknown>;

export function asObject(args: unknown): ToolArgs {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return {};
  }
  return args as ToolArgs;
}

export function getRequiredId(args: ToolArgs, key = "id"): string | number {
  const value = args[key];
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  throw new Error(`"${key}" must be a string (UUID) or a number.`);
}

export function getRequiredNumber(args: ToolArgs, key: string): number {
  const value = args[key];
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`"${key}" must be a number.`);
  }
  return value;
}

export function getOptionalNumber(args: ToolArgs, key: string): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`"${key}" must be a number when provided.`);
  }
  return value;
}

export function getRequiredString(args: ToolArgs, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`"${key}" must be a non-empty string.`);
  }
  return value;
}

export function getOptionalString(args: ToolArgs, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`"${key}" must be a string when provided.`);
  }
  return value;
}

export function getOptionalBoolean(args: ToolArgs, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`"${key}" must be a boolean when provided.`);
  }
  return value;
}

export function getOptionalStringArray(
  args: ToolArgs,
  key: string,
): string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`"${key}" must be an array of strings when provided.`);
  }
  return value;
}

interface ProjectApiResult {
  id: string;
  name: string;
}

export async function resolveProjectId(
  args: ToolArgs,
  client: TestITApiClient,
): Promise<string> {
  const explicitProjectId = args.projectId;
  if (typeof explicitProjectId === "string" && explicitProjectId.length > 0) {
    return explicitProjectId;
  }

  const projectName = getOptionalString(args, "projectName");
  if (projectName !== undefined) {
    if (projectName.trim().length === 0) {
      throw new Error("\"projectName\" must be a non-empty string when provided.");
    }

    // Use search to find project by name
    const projects = await client.post<ProjectApiResult[]>(
      "/api/v2/projects/search",
      { name: projectName }
    );

    const exactMatch = projects.find(
      (project) =>
        typeof project.name === "string" &&
        project.name.toLowerCase() === projectName.toLowerCase(),
    );

    if (!exactMatch) {
      throw new Error(
        `Project "${projectName}" not found. Pass "projectId" explicitly or use an exact project name.`,
      );
    }

    return exactMatch.id;
  }

  if (process.env.TESTIT_PROJECT_ID) {
    return process.env.TESTIT_PROJECT_ID;
  }

  throw new Error(
    "Project scope is required. Pass \"projectId\" (UUID) or \"projectName\", or set TESTIT_PROJECT_ID in env.",
  );
}

export function getObjectPayload(
  args: ToolArgs,
  key = "payload",
): Record<string, unknown> {
  const payload = args[key];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`"${key}" must be an object.`);
  }
  return payload as Record<string, unknown>;
}

export function getOptionalObjectPayload(
  args: ToolArgs,
  key = "payload",
): Record<string, unknown> | undefined {
  const payload = args[key];
  if (payload === undefined || payload === null) {
    return undefined;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`"${key}" must be an object when provided.`);
  }
  return payload as Record<string, unknown>;
}

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined>;

export function pickPagination(args: ToolArgs): QueryParams {
  return {
    Skip: getOptionalNumber(args, "skip") ?? getOptionalNumber(args, "page"),
    Take: getOptionalNumber(args, "take") ?? getOptionalNumber(args, "size"),
    OrderBy: getOptionalString(args, "orderBy") ?? getOptionalString(args, "sort"),
  };
}
