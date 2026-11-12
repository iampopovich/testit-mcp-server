import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("iteration 20 tools", () => {
  it("create_test_run_from_test_points validates selectors and posts byConfigurations", async () => {
    const { client, call } = setup();
    const selectors = [{ configurationId: "c1", workItemIds: ["w1"] }];
    await call("create_test_run_from_test_points", { projectId: "p1", testPlanId: "tp", testPointSelectors: selectors });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/byConfigurations",
      body: { projectId: "p1", testPlanId: "tp", testPointSelectors: selectors },
    });
    await expect(
      call("create_test_run_from_test_points", {
        projectId: "p1",
        testPlanId: "tp",
        testPointSelectors: [{ configurationId: "c1", workItemIds: [] }],
      }),
    ).rejects.toThrow('"testPointSelectors" must be');
  });

  it("rerun_test_run_results selects explicit result ids only", async () => {
    const { client, call } = setup();
    await call("rerun_test_run_results", { id: "r1", testResultIds: ["t1"] });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/r1/reruns",
      body: { extractionModel: { testResultIds: { include: ["t1"] } } },
    });
    await expect(call("rerun_test_run_results", { id: "r1", testResultIds: [] })).rejects.toThrow("non-empty");
  });

  it("suite/point/result/configuration read tools hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("set_test_suite", { id: "s1", name: "N" });
    await call("list_test_suite_test_results", { id: "s1" });
    await call("list_test_suite_configurations", { id: "s1" });
    await call("get_test_point_work_item", { id: "pt" });
    await call("list_test_point_test_runs", { id: "pt" });
    await call("get_test_result_reruns", { id: "tr" });
    await call("get_test_results_statistics", { testRunIds: ["r1"] });
    await call("search_configurations", { projectId: "p1", name: "An", take: 3 });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "PATCH /api/v2/testSuites/s1",
      "GET /api/v2/testSuites/s1/testResults",
      "GET /api/v2/testSuites/s1/configurations",
      "GET /api/v2/testPoints/pt/workItem",
      "GET /api/v2/testPoints/pt/testRuns",
      "GET /api/v2/testResults/tr/reruns",
      "POST /api/v2/testResults/statistics/filter",
      "POST /api/v2/configurations/search",
    ]);
    expect(client.calls[0].body).toEqual([{ op: "replace", path: "/name", value: "N" }]);
    expect(client.calls[6].body).toEqual({ testRunIds: ["r1"] });
    expect(client.calls[7].body).toEqual({ projectIds: ["p1"], name: "An" });
    expect(definedQuery(client.calls[7].query)).toEqual({ Take: 3 });
  });
});
