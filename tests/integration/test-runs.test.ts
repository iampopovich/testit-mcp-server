import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, uniqueName } from "./setup.js";

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
    await callSafe("delete_test_run", { id: run?.id });
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
});
