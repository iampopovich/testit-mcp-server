import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, uniqueName } from "./setup.js";

interface TestPlan {
  id: string;
  name: string;
  status: string;
  tags: Array<{ name: string }>;
  isDeleted: boolean;
}

async function removeTestPlan(id: string | undefined): Promise<void> {
  if (!id) return;
  await callSafe("delete_test_plan", { id });
  await callSafe("purge_test_plan", { id });
}

describe.skipIf(!integrationEnabled)("integration: test plans", () => {
  const created: string[] = [];

  afterAll(async () => {
    for (const id of created) {
      await removeTestPlan(id);
    }
  });

  it("create -> start -> pause -> start -> complete", async () => {
    const plan = await callTool<TestPlan>("create_test_plan", { name: uniqueName("plan"), tags: ["mcp-it"] });
    created.push(plan.id);
    expect(plan.status).toBe("New");
    expect(plan.tags.map((t) => t.name)).toEqual(["mcp-it"]);

    const expected: Record<string, string> = { start: "InProgress", pause: "Paused", complete: "Completed" };
    for (const action of ["start", "pause", "start", "complete"]) {
      await callTool("set_test_plan_state", { id: plan.id, action });
      expect((await callTool<TestPlan>("get_test_plan", { id: plan.id })).status).toBe(expected[action]);
    }
    expect(await callTool<unknown[]>("list_test_plan_test_runs", { id: plan.id })).toEqual([]);
  });

  it("clone -> delete -> restore -> delete -> purge", async () => {
    const plan = await callTool<TestPlan>("create_test_plan", { name: uniqueName("plan-src") });
    created.push(plan.id);
    const clone = await callTool<TestPlan>("create_test_plan_clone", { id: plan.id });
    created.push(clone.id);
    expect(clone.name).toBe(`${plan.name} (1)`);

    await callTool("delete_test_plan", { id: clone.id });
    const archived = await callTool<TestPlan[]>("list_test_plans", { isDeleted: true });
    expect(archived.map((p) => p.id)).toContain(clone.id);
    await callTool("restore_test_plan", { id: clone.id });
    expect((await callTool<TestPlan>("get_test_plan", { id: clone.id })).isDeleted).toBe(false);

    await callTool("delete_test_plan", { id: clone.id });
    await callTool("purge_test_plan", { id: clone.id });
    await expect(callTool("get_test_plan", { id: clone.id })).rejects.toThrow("(404)");
  });
});
