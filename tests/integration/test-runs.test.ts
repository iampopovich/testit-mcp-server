import { afterAll, describe, expect, it } from "vitest";
import { callTool, integrationEnabled, removeTestRun, uniqueName } from "./setup.js";

interface TestRun {
  id: string;
  name: string;
  stateName: string;
  tags: string[];
}

describe.skipIf(!integrationEnabled)("integration: test run lifecycle", () => {
  const name = uniqueName("run");
  let run: TestRun | undefined;

  afterAll(async () => {
    await removeTestRun(run?.id);
  });

  it("create -> start -> complete, visible in list_test_runs by state", async () => {
    run = await callTool<TestRun>("create_test_run", { name, tags: ["mcp-it"] });
    expect(run.stateName).toBe("NotStarted");
    expect(run.tags).toEqual(["mcp-it"]);

    await callTool("start_test_run", { id: run.id });
    expect((await callTool<TestRun>("get_test_run", { id: run.id })).stateName).toBe("InProgress");

    const inProgress = await callTool<TestRun[]>("list_test_runs", { inProgress: true, take: 200 });
    expect(inProgress.map((r) => r.id)).toContain(run.id);

    await callTool("complete_test_run", { id: run.id });
    expect((await callTool<TestRun>("get_test_run", { id: run.id })).stateName).toBe("Completed");

    const notStarted = await callTool<TestRun[]>("list_test_runs", { notStarted: true, take: 200 });
    expect(notStarted.map((r) => r.id)).not.toContain(run.id);
  });

  it("delete -> restore -> delete -> purge", async () => {
    const temp = await callTool<TestRun>("create_test_run", { name: uniqueName("run-temp") });
    await callTool("delete_test_run", { id: temp.id });
    await callTool("restore_test_run", { id: temp.id });
    expect((await callTool<TestRun>("get_test_run", { id: temp.id })).id).toBe(temp.id);
    await callTool("delete_test_run", { id: temp.id });
    await callTool("purge_test_run", { id: temp.id });
    await expect(callTool("get_test_run", { id: temp.id })).rejects.toThrow("(404)");
  });
});
