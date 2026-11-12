import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, removeTestRun, uniqueName } from "./setup.js";

describe.skipIf(!integrationEnabled)("integration: bulk toolset", () => {
  const prefix = uniqueName("bulk");
  const runs: string[] = [];
  const plans: string[] = [];
  const configurations: string[] = [];

  afterAll(async () => {
    for (const id of runs) await removeTestRun(id);
    for (const id of plans) {
      await callSafe("delete_test_plan", { id });
      await callSafe("purge_test_plan", { id });
    }
    for (const id of configurations) {
      await callSafe("delete_configuration", { id });
      await callSafe("purge_configuration", { id });
    }
  });

  it("test runs: mass tags/description, delete -> restore -> delete -> purge", async () => {
    for (const n of [1, 2]) {
      runs.push((await callTool<{ id: string }>("create_test_run", { name: `${prefix}-run${n}`, tags: ["a"] })).id);
    }
    const tags = async () =>
      Promise.all(runs.map(async (id) => (await callTool<{ tags: string[] }>("get_test_run", { id })).tags.sort()));

    await callTool("set_test_runs", { ids: runs, tagsAction: "Add", tags: ["b"], description: "bulk" });
    expect(await tags()).toEqual([
      ["a", "b"],
      ["a", "b"],
    ]);
    await callTool("set_test_runs", { ids: runs, tagsAction: "ToRemove", tags: ["a"] });
    expect(await tags()).toEqual([["b"], ["b"]]);
    await callTool("set_test_runs", { ids: runs, tagsAction: "ClearAll" });
    expect(await tags()).toEqual([[], []]);
    expect((await callTool<{ description: string }>("get_test_run", { id: runs[0] })).description).toBe("bulk");

    expect(await callTool("delete_test_runs", { ids: runs })).toBe(2);
    expect(await callTool("restore_test_runs", { ids: runs })).toBe(2);
    expect(await callTool("delete_test_runs", { ids: runs })).toBe(2);
    expect(await callTool("purge_test_runs", { ids: runs })).toBe(2);
    await expect(callTool("get_test_run", { id: runs[0] })).rejects.toThrow("(404)");
  });

  it("test plans and configurations: delete -> restore -> delete -> purge", async () => {
    for (const n of [1, 2]) {
      plans.push((await callTool<{ id: string }>("create_test_plan", { name: `${prefix}-plan${n}` })).id);
      configurations.push((await callTool<{ id: string }>("create_configuration", { name: `${prefix}-cfg${n}` })).id);
    }
    expect((await callTool<string[]>("delete_test_plans", { ids: plans })).sort()).toEqual([...plans].sort());
    expect((await callTool<{ isDeleted: boolean }>("get_test_plan", { id: plans[0] })).isDeleted).toBe(true);
    await callTool("restore_test_plans", { ids: plans });
    expect((await callTool<{ isDeleted: boolean }>("get_test_plan", { id: plans[0] })).isDeleted).toBe(false);
    await callTool("delete_test_plans", { ids: plans });
    await callTool("purge_test_plans", { ids: plans });
    await expect(callTool("get_test_plan", { id: plans[0] })).rejects.toThrow("(404)");

    expect(await callTool("delete_configurations", { ids: configurations })).toBe(2);
    expect(await callTool("restore_configurations", { ids: configurations })).toBe(2);
    expect(await callTool("delete_configurations", { ids: configurations })).toBe(2);
    expect(await callTool("purge_configurations", { ids: configurations })).toBe(2);
    await expect(callTool("get_configuration", { id: configurations[0] })).rejects.toThrow("(404)");
  });

  it("delete_autotests archives autotests", async () => {
    const autoTest = await callTool<{ id: string }>("create_autotest", { externalId: `${prefix}-ext`, name: prefix });
    expect(await callTool("delete_autotests", { ids: [autoTest.id] })).toMatchObject({ deletedCount: 1 });
    await expect(callTool("get_autotest", { id: autoTest.id })).rejects.toThrow("(404)");
  });

  it("search_background_jobs returns an array", async () => {
    expect(Array.isArray(await callTool("search_background_jobs", { take: 5 }))).toBe(true);
  });
});
