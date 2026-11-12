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

/**
 * Required base64 (standard or URL-safe, whitespace ignored). Buffer.from() silently
 * drops invalid characters, so without this check garbage would be uploaded.
 */
export function getRequiredBase64(args: ToolArgs, key: string): string {
  const value = getRequiredString(args, key).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(value) || value.replace(/=+$/, "").length % 4 === 1) {
    throw new Error(`"${key}" must be valid base64.`);
  }
  return value;
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

/**
 * Typed subset of TestIT WorkItemFilterApiModel exposed as tool args.
 */
export const WORK_ITEM_FILTER_PROPERTIES = {
  name: { type: "string", description: "Filter by (part of) work item name." },
  types: {
    type: "array",
    items: { type: "string", enum: ["TestCases", "CheckLists", "SharedSteps"] },
    description: "Work item types.",
  },
  states: {
    type: "array",
    items: { type: "string", enum: ["NeedsWork", "NotReady", "Ready"] },
  },
  priorities: {
    type: "array",
    items: { type: "string", enum: ["Lowest", "Low", "Medium", "High", "Highest"] },
  },
  tags: { type: "array", items: { type: "string" }, description: "Tag names." },
  sectionIds: { type: "array", items: { type: "string" }, description: "Section UUIDs." },
  isAutomated: { type: "boolean" },
  isDeleted: { type: "boolean", description: "Search archived (deleted) work items." },
} as const;

export function buildWorkItemFilter(args: ToolArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    name: getOptionalString(args, "name"),
    types: getOptionalStringArray(args, "types"),
    states: getOptionalStringArray(args, "states"),
    priorities: getOptionalStringArray(args, "priorities"),
    tags: getOptionalStringArray(args, "tags"),
    sectionIds: getOptionalStringArray(args, "sectionIds"),
    isAutomated: getOptionalBoolean(args, "isAutomated"),
    isDeleted: getOptionalBoolean(args, "isDeleted"),
  };
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== undefined));
}

type QueryValue = string | number | boolean | Array<string | number | boolean>;
type QueryParams = Record<string, QueryValue | undefined>;

export const DEFAULT_PAGE_SIZE = 50;

/**
 * Input-schema properties for TestIT list/search endpoints that accept
 * Skip/Take/OrderBy/SearchField/SearchValue query params.
 */
export const PAGINATION_PROPERTIES = {
  skip: { type: "number", description: "Number of items to skip (offset)." },
  take: { type: "number", description: "Max number of items to return." },
  page: {
    type: "number",
    description: `1-based page number; alternative to skip. Uses "size" (default ${DEFAULT_PAGE_SIZE}).`,
  },
  size: { type: "number", description: "Page size for \"page\"; alias of take." },
  orderBy: { type: "string", description: "Sort expression, e.g. \"createdDate desc\"." },
  searchField: { type: "string", description: "Field name to search in." },
  searchValue: { type: "string", description: "Value to search for in searchField." },
} as const;

/**
 * Maps tool args to TestIT query params. "skip"/"take" win over "page"/"size";
 * page is 1-based and converted to an offset.
 */
export function pickPagination(args: ToolArgs): QueryParams {
  const take = getOptionalNumber(args, "take") ?? getOptionalNumber(args, "size");
  let skip = getOptionalNumber(args, "skip");
  const page = getOptionalNumber(args, "page");
  if (skip === undefined && page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error("\"page\" must be an integer >= 1.");
    }
    skip = (page - 1) * (take ?? DEFAULT_PAGE_SIZE);
  }
  return {
    Skip: skip,
    Take: take ?? (page !== undefined ? DEFAULT_PAGE_SIZE : undefined),
    OrderBy: getOptionalString(args, "orderBy") ?? getOptionalString(args, "sort"),
    SearchField: getOptionalString(args, "searchField"),
    SearchValue: getOptionalString(args, "searchValue"),
  };
}
