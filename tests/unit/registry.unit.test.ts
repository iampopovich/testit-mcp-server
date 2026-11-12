import { describe, expect, it } from "vitest";
import { buildToolRegistry, isTruthyEnv, parseListEnv } from "../../src/server-bootstrap.js";
import { annotationsFor } from "../../src/tools/annotations.js";
import { createRecordingClient, expectObjectSchemas, expectToolHandlerParity } from "./tool-test-helpers.js";

describe("tool registry", () => {
  it("has unique tool names, a handler per tool and valid object schemas", () => {
    const client = createRecordingClient();
    const { tools, handlers } = buildToolRegistry(client as never);
    const bundle = { tools, handlers: Object.fromEntries(handlers) };
    expectToolHandlerParity(bundle);
    expectObjectSchemas(bundle);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("annotates every tool", () => {
    const { tools } = buildToolRegistry(createRecordingClient() as never);
    for (const tool of tools) {
      expect(tool.annotations, tool.name).toBeDefined();
      expect(tool.annotations?.openWorldHint, tool.name).toBe(true);
      expect(typeof tool.annotations?.readOnlyHint, tool.name).toBe("boolean");
    }
  });

  it("classifies verbs: reads are read-only, delete/purge/PUT-update are destructive", () => {
    expect(annotationsFor("get_project")).toMatchObject({ readOnlyHint: true });
    expect(annotationsFor("search_work_items")).toMatchObject({ readOnlyHint: true });
    expect(annotationsFor("delete_work_item")).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(annotationsFor("purge_test_run")).toMatchObject({ destructiveHint: true });
    expect(annotationsFor("update_test_result")).toMatchObject({ destructiveHint: true });
    expect(annotationsFor("set_test_result")).toMatchObject({ destructiveHint: false, idempotentHint: true });
    expect(annotationsFor("create_test_run")).toMatchObject({ destructiveHint: false, idempotentHint: false });
    expect(() => annotationsFor("frobnicate_thing")).toThrow('no annotation rule for verb "frobnicate"');
  });

  it("readOnly mode exposes only read-only tools and their handlers", () => {
    const full = buildToolRegistry(createRecordingClient() as never);
    const ro = buildToolRegistry(createRecordingClient() as never, { readOnly: true });
    expect(ro.tools.length).toBeGreaterThan(0);
    expect(ro.tools.length).toBeLessThan(full.tools.length);
    expect(ro.tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
    expect([...ro.handlers.keys()].sort()).toEqual(ro.tools.map((t) => t.name).sort());
    expect(ro.handlers.has("delete_work_item")).toBe(false);
  });

  it("toolsets select bundles; unknown toolset names fail fast", () => {
    const only = buildToolRegistry(createRecordingClient() as never, { toolsets: ["projects", "test-runs"] });
    expect(only.tools.some((t) => t.name === "get_project")).toBe(true);
    expect(only.tools.some((t) => t.name === "create_test_run")).toBe(true);
    expect(only.tools.some((t) => t.name === "list_work_items")).toBe(false);
    expect(() => buildToolRegistry(createRecordingClient() as never, { toolsets: ["nope"] })).toThrow(
      /Unknown toolset\(s\) in TESTIT_TOOLSETS: nope\. Valid: projects, work-items/,
    );
    const roRuns = buildToolRegistry(createRecordingClient() as never, { toolsets: ["test-runs"], readOnly: true });
    expect(roRuns.tools.map((t) => t.name).sort()).toEqual(["get_test_run", "get_test_run_results", "list_test_runs"]);
  });

  it("parseListEnv splits on commas and spaces", () => {
    expect(parseListEnv(" projects, work-items  test-runs,")).toEqual(["projects", "work-items", "test-runs"]);
    expect(parseListEnv("")).toBeUndefined();
    expect(parseListEnv(undefined)).toBeUndefined();
  });

  it("isTruthyEnv parses common truthy values", () => {
    expect(["1", "true", "TRUE", " yes ", "on"].every(isTruthyEnv)).toBe(true);
    expect([undefined, "", "0", "false", "no"].some(isTruthyEnv)).toBe(false);
  });
});
