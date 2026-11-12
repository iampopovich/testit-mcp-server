import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callSafe,
  callTool,
  getDefaultConfigurationId,
  integrationEnabled,
  removeTestRun,
  removeWorkItem,
  uniqueName,
} from "./setup.js";

interface Run {
  id: string;
  stateName: string;
  testResults: Array<{ id: string }>;
}

/** Plan run from test points -> Failed -> rerun -> Passed; attempts, statistics, point/suite views. */
describe.skipIf(!integrationEnabled)("integration: test point runs, reruns, statistics", () => {
  const prefix = uniqueName("i20");
  const externalId = `${prefix}-ext`;
  let configurationId: string;
  let workItemId: string;
  let autoTestId: string | undefined;
  let planId: string | undefined;
  let suiteId: string;
  let run: Run | undefined;

  beforeAll(async () => {
    configurationId = await getDefaultConfigurationId();
    workItemId = (await callTool<{ id: string }>("create_work_item", { name: `${prefix}-case`, state: "Ready" })).id;
    autoTestId = (
      await callTool<{ id: string }>("create_autotest", { externalId, name: prefix, workItemIds: [workItemId] })
    ).id;
    planId = (await callTool<{ id: string }>("create_test_plan", { name: `${prefix}-plan` })).id;
    suiteId = (await callTool<{ id: string }>("create_test_suite", { testPlanId: planId, name: "s" })).id;
    await callTool("set_test_suite_work_items", { id: suiteId, workItemIds: [workItemId] });
  });

  afterAll(async () => {
    await removeTestRun(run?.id);
    await callSafe("delete_test_plan", { id: planId });
    await callSafe("purge_test_plan", { id: planId });
    await callSafe("delete_autotest", { id: autoTestId });
    await removeWorkItem(workItemId);
  });

  it("suite rename and configurations", async () => {
    await callTool("set_test_suite", { id: suiteId, name: "Renamed" });
    expect((await callTool<{ name: string }>("get_test_suite", { id: suiteId })).name).toBe("Renamed");
    const configs = await callTool<Array<{ id: string }>>("list_test_suite_configurations", { id: suiteId });
    expect(configs.map((c) => c.id)).toEqual([configurationId]);
  });

  it("run from test points -> Failed -> rerun -> Passed; reruns, statistics, point and suite views", async () => {
    run = await callTool<Run>("create_test_run_from_test_points", {
      testPlanId: planId,
      testPointSelectors: [{ configurationId, workItemIds: [workItemId] }],
      name: prefix,
    });
    expect(run.stateName).toBe("NotStarted");
    const resultId = run.testResults[0].id;

    const submit = (statusCode: string) =>
      callTool("submit_test_run_results", {
        id: run!.id,
        results: [{ autoTestExternalId: externalId, configurationId, statusCode }],
      });
    await submit("Failed");
    expect(await callTool("get_test_results_statistics", { testRunIds: [run.id] })).toMatchObject({
      statuses: { failed: 1, passed: 0 },
    });

    expect(await callTool("rerun_test_run_results", { id: run.id, testResultIds: [resultId] })).toEqual({
      testResultsCount: 1,
    });
    expect((await callTool<{ stateName: string }>("get_test_run", { id: run.id })).stateName).toBe("InProgress");
    await submit("Passed");

    const reruns = await callTool<{ rerunCount: number; rerunTestResults: Array<{ runNumber: number; status: { code: string } }> }>(
      "get_test_result_reruns",
      { id: resultId },
    );
    expect(reruns.rerunCount).toBe(2);
    expect(reruns.rerunTestResults.map((r) => [r.runNumber, r.status.code])).toEqual([
      [1, "FAILED"],
      [2, "PASSED"],
    ]);

    const [point] = await callTool<Array<{ id: string }>>("list_test_suite_test_points", { id: suiteId });
    expect((await callTool<{ id: string }>("get_test_point_work_item", { id: point.id })).id).toBe(workItemId);
    const pointRuns = await callTool<Array<{ id: string }>>("list_test_point_test_runs", { id: point.id });
    expect(pointRuns.map((r) => r.id)).toEqual([run.id]);
    const suiteResults = await callTool<Array<{ autoTestId: string }>>("list_test_suite_test_results", { id: suiteId });
    expect(suiteResults.length).toBeGreaterThan(0);
    expect(suiteResults.every((r) => r.autoTestId === autoTestId)).toBe(true);
  });

  it("search_configurations finds the default configuration by name", async () => {
    const all = await callTool<Array<{ id: string; name: string }>>("list_configurations", {});
    const defaultName = all.find((c) => c.id === configurationId)!.name;
    const found = await callTool<Array<{ id: string }>>("search_configurations", { name: defaultName });
    expect(found.map((c) => c.id)).toContain(configurationId);
  });
});
