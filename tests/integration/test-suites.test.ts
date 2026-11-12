import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

interface Suite {
  id: string;
  name: string;
  parentId: string | null;
  children?: Suite[];
}
interface TestPoint {
  id: string;
  workItemId: string;
  status: string;
}

describe.skipIf(!integrationEnabled)("integration: test suites and test points", () => {
  const prefix = uniqueName("suite");
  let planId: string;
  const workItemIds: string[] = [];

  beforeAll(async () => {
    planId = (await callTool<{ id: string }>("create_test_plan", { name: `${prefix}-plan` })).id;
    for (const n of [1, 2]) {
      workItemIds.push((await callTool<{ id: string }>("create_work_item", { name: `${prefix}-case-${n}` })).id);
    }
  });

  afterAll(async () => {
    await callSafe("delete_test_plan", { id: planId });
    await callSafe("purge_test_plan", { id: planId });
    for (const id of workItemIds) {
      await removeWorkItem(id);
    }
  });

  it("suite tree, work items -> test points (replace semantics), search, delete", async () => {
    const suite = await callTool<Suite>("create_test_suite", { testPlanId: planId, name: "Smoke" });
    const sub = await callTool<Suite>("create_test_suite", { testPlanId: planId, name: "Login", parentId: suite.id });
    const tree = await callTool<Suite[]>("list_test_plan_test_suites", { testPlanId: planId });
    expect(tree.map((s) => s.name)).toEqual(["Smoke"]);
    expect(tree[0].children?.map((s) => s.name)).toEqual(["Login"]);
    expect((await callTool<Suite>("get_test_suite", { id: sub.id })).parentId).toBe(suite.id);

    const [configuration] = await callTool<Array<{ id: string }>>("list_configurations", {});
    await callTool("set_test_suite_configurations", { id: suite.id, configurationIds: [configuration.id] });

    await callTool("set_test_suite_work_items", { id: suite.id, workItemIds });
    let points = await callTool<TestPoint[]>("list_test_suite_test_points", { id: suite.id });
    expect(points.map((p) => p.workItemId).sort()).toEqual([...workItemIds].sort());
    expect(points.every((p) => p.status === "NoResults")).toBe(true);

    await callTool("set_test_suite_work_items", { id: suite.id, workItemIds: [workItemIds[0]] });
    points = await callTool<TestPoint[]>("list_test_suite_test_points", { id: suite.id });
    expect(points.map((p) => p.workItemId)).toEqual([workItemIds[0]]);

    const found = await callTool<TestPoint[]>("search_test_points", { testPlanIds: [planId], statuses: ["NoResults"] });
    expect(found.map((p) => p.id)).toEqual(points.map((p) => p.id));

    await callTool("delete_test_suite", { id: sub.id });
    await expect(callTool("get_test_suite", { id: sub.id })).rejects.toThrow("(404)");
  });
});
