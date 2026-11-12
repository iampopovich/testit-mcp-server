import { afterEach, describe, expect, it, vi } from "vitest";
import {
  asObject,
  getObjectPayload,
  getOptionalBoolean,
  getOptionalNumber,
  getOptionalObjectPayload,
  getOptionalString,
  getOptionalStringArray,
  getRequiredId,
  getRequiredNumber,
  getRequiredString,
  resolveProjectId,
} from "../../../src/tools/utils.js";

describe("tool utils", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asObject returns empty object for invalid raw args", () => {
    expect(asObject(undefined)).toEqual({});
    expect(asObject(null)).toEqual({});
    expect(asObject([])).toEqual({});
    expect(asObject("x")).toEqual({});
    expect(asObject({ id: 1 })).toEqual({ id: 1 });
  });

  it("number validators accept numbers and numeric strings", () => {
    expect(getRequiredNumber({ n: 5 }, "n")).toBe(5);
    expect(getRequiredNumber({ n: "5" }, "n")).toBe(5);
    expect(() => getRequiredNumber({}, "n")).toThrow('"n" must be a number.');
    expect(getOptionalNumber({}, "n")).toBeUndefined();
    expect(() => getOptionalNumber({ n: "x" }, "n")).toThrow('"n" must be a number when provided.');
  });

  it("string, boolean and string-array validators", () => {
    expect(getRequiredString({ s: "a" }, "s")).toBe("a");
    expect(() => getRequiredString({ s: "" }, "s")).toThrow('"s" must be a non-empty string.');
    expect(getOptionalString({}, "s")).toBeUndefined();
    expect(() => getOptionalString({ s: 1 }, "s")).toThrow('"s" must be a string when provided.');
    expect(getOptionalBoolean({ b: false }, "b")).toBe(false);
    expect(() => getOptionalBoolean({ b: "yes" }, "b")).toThrow('"b" must be a boolean when provided.');
    expect(getOptionalStringArray({ a: ["x"] }, "a")).toEqual(["x"]);
    expect(() => getOptionalStringArray({ a: [1] }, "a")).toThrow(
      '"a" must be an array of strings when provided.',
    );
  });

  it("getRequiredId accepts UUID strings and global numeric ids", () => {
    expect(getRequiredId({ id: "abc" })).toBe("abc");
    expect(getRequiredId({ id: 42 })).toBe(42);
    expect(() => getRequiredId({})).toThrow('"id" must be a string (UUID) or a number.');
  });

  it("object payload validators enforce object shape", () => {
    expect(getObjectPayload({ payload: { id: 1 } })).toEqual({ id: 1 });
    expect(() => getObjectPayload({ payload: [] })).toThrow('"payload" must be an object.');
    expect(getOptionalObjectPayload({})).toBeUndefined();
    expect(() => getOptionalObjectPayload({ payload: [] })).toThrow(
      '"payload" must be an object when provided.',
    );
  });

  it("resolveProjectId prefers explicit projectId", async () => {
    const client = { post: vi.fn() };
    await expect(resolveProjectId({ projectId: "p-1" }, client as never)).resolves.toBe("p-1");
    expect(client.post).not.toHaveBeenCalled();
  });

  it("resolveProjectId resolves exact projectName (case-insensitive) via projects/search", async () => {
    const client = {
      post: vi.fn().mockResolvedValue([
        { id: "p-1", name: "Demo Project 2" },
        { id: "p-2", name: "Demo Project" },
      ]),
    };
    await expect(resolveProjectId({ projectName: "demo project" }, client as never)).resolves.toBe("p-2");
    expect(client.post).toHaveBeenCalledWith("/api/v2/projects/search", { name: "demo project" });
  });

  it("resolveProjectId rejects empty or unknown projectName", async () => {
    const client = { post: vi.fn().mockResolvedValue([{ id: "p-1", name: "X" }]) };
    await expect(resolveProjectId({ projectName: "  " }, client as never)).rejects.toThrow(
      '"projectName" must be a non-empty string when provided.',
    );
    await expect(resolveProjectId({ projectName: "Y" }, client as never)).rejects.toThrow(
      'Project "Y" not found.',
    );
  });

  it("resolveProjectId falls back to TESTIT_PROJECT_ID and errors without it", async () => {
    vi.stubEnv("TESTIT_PROJECT_ID", "env-project");
    await expect(resolveProjectId({}, {} as never)).resolves.toBe("env-project");
    vi.stubEnv("TESTIT_PROJECT_ID", "");
    await expect(resolveProjectId({}, {} as never)).rejects.toThrow("Project scope is required.");
  });
});
