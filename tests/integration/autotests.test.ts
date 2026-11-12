import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getDefaultConfigurationId, integrationEnabled, removeTestRun, removeWorkItem, uniqueName } from "./setup.js";

interface AutoTest {
  id: string;
  externalId: string;
}

/**
 * End-to-end test plan execution the way TestIT allows it via API:
 * case -> autotest linked -> plan -> suite -> run from work items -> submit result -> point Passed.
 */
describe.skipIf(!integrationEnabled)("integration: autotests and plan-based runs", () => {
  const prefix = uniqueName("at");
  const externalId = `${prefix}-ext`;
  let workItemId: string;
  let autoTest: AutoTest | undefined;
  let planId: string | undefined;
  let runId: string | undefined;
  let configurationId: string;

  beforeAll(async () => {
    workItemId = (await callTool<{ id: string }>("create_work_item", { name: `${prefix}-case`, state: "Ready" })).id;
    configurationId = await getDefaultConfigurationId();
  });

  afterAll(async () => {
    await removeTestRun(runId);
    await callSafe("delete_test_plan", { id: planId });
    await callSafe("purge_test_plan", { id: planId });
    await callSafe("delete_autotest", { id: autoTest?.id });
    await removeWorkItem(workItemId);
  });

  it("create, search, link/unlink autotests", async () => {
    autoTest = await callTool<AutoTest>("create_autotest", { externalId, name: `${prefix} autotest`, workItemIds: [workItemId] });
    expect((await callTool<{ isAutomated: boolean }>("get_work_item", { id: workItemId })).isAutomated).toBe(true);

    const found = await callTool<AutoTest[]>("search_autotests", { externalIds: [externalId] });
    expect(found.map((a) => a.id)).toEqual([autoTest.id]);

    await callTool("unlink_autotest_work_item", { id: autoTest.id, workItemId });
    expect(await callTool<unknown[]>("list_autotest_work_items", { id: autoTest.id })).toEqual([]);
    await callTool("link_autotest_work_item", { id: autoTest.id, workItemId });
    const linked = await callTool<Array<{ id: string }>>("list_autotest_work_items", { id: autoTest.id });
    expect(linked.map((w) => w.id)).toEqual([workItemId]);
  });

  it("delete_autotest archives: get -> 404, search finds it only with isDeleted=true", async () => {
    const temp = await callTool<AutoTest>("create_autotest", { externalId: `${prefix}-tmp`, name: `${prefix} tmp` });
    await callTool("delete_autotest", { id: temp.id });
    await expect(callTool("get_autotest", { id: temp.id })).rejects.toThrow("(404)");
    expect(await callTool<AutoTest[]>("search_autotests", { externalIds: [temp.externalId] })).toEqual([]);
    const archived = await callTool<AutoTest[]>("search_autotests", { externalIds: [temp.externalId], isDeleted: true });
    expect(archived.map((a) => a.id)).toEqual([temp.id]);
  });

  it("plan run from automated work items: submit result -> test point Passed, run Completed", async () => {
    planId = (await callTool<{ id: string }>("create_test_plan", { name: `${prefix}-plan` })).id;
    const suite = await callTool<{ id: string }>("create_test_suite", { testPlanId: planId, name: "Auto" });
    await callTool("set_test_suite_work_items", { id: suite.id, workItemIds: [workItemId] });

    const run = await callTool<{ id: string; stateName: string; testResults: Array<{ id: string }> }>(
      "create_test_run_from_work_items",
      { testPlanId: planId, workItemIds: [workItemId], configurationIds: [configurationId], name: `${prefix}-run` },
    );
    runId = run.id;
    expect(run.stateName).toBe("NotStarted");
    expect(run.testResults).toHaveLength(1);
    expect((await callTool<{ status: string }>("get_test_plan", { id: planId })).status).toBe("InProgress");

    const [resultId] = await callTool<string[]>("submit_test_run_results", {
      id: run.id,
      results: [{ autoTestExternalId: externalId, configurationId, statusCode: "Passed" }],
    });
    expect(resultId).toBe(run.testResults[0].id); // fills the pre-created result

    const points = await callTool<Array<{ status: string }>>("list_test_suite_test_points", { id: suite.id });
    expect(points.map((p) => p.status)).toEqual(["Passed"]);
    expect((await callTool<{ stateName: string }>("get_test_run", { id: run.id })).stateName).toBe("Completed");

    const summary = await callTool<{ totalTestPointsCount: number; completedTestPointsCount: number }>(
      "get_test_plan_summary",
      { id: planId },
    );
    expect(summary).toMatchObject({ totalTestPointsCount: 1, completedTestPointsCount: 1 });

    const [point] = await callTool<Array<{ id: string }>>("list_test_suite_test_points", { id: suite.id });
    await callTool("reset_test_points", { id: planId, testPointIds: [point.id] });
    const after = await callTool<Array<{ status: string }>>("list_test_suite_test_points", { id: suite.id });
    expect(after.map((p) => p.status)).toEqual(["NoResults"]);
  });
});
