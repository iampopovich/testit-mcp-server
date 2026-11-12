import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("test suite and test point tools", () => {
  it("create_test_suite sends only provided fields", async () => {
    const { client, call } = setup();
    await call("create_test_suite", { testPlanId: "tp", name: "Smoke" });
    await call("create_test_suite", { testPlanId: "tp", name: "Sub", parentId: "s1", type: "Custom" });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testSuites", body: { testPlanId: "tp", name: "Smoke" } });
    expect(client.calls[1].body).toEqual({ testPlanId: "tp", name: "Sub", parentId: "s1", type: "Custom" });
  });

  it("set_* tools post plain id arrays", async () => {
    const { client, call } = setup();
    await call("set_test_suite_work_items", { id: "s1", workItemIds: ["w1", "w2"] });
    await call("set_test_suite_configurations", { id: "s1", configurationIds: ["c1"] });
    expect(client.calls[0]).toMatchObject({ path: "/api/v2/testSuites/s1/workItems", body: ["w1", "w2"] });
    expect(client.calls[1]).toMatchObject({ path: "/api/v2/testSuites/s1/configurations", body: ["c1"] });
    await expect(call("set_test_suite_work_items", { id: "s1" })).rejects.toThrow('"workItemIds" must be an array');
  });

  it("search_test_points merges typed fields over raw filter", async () => {
    const { client, call } = setup();
    await call("search_test_points", {
      testPlanIds: ["tp"],
      statuses: ["NoResults"],
      filter: { isAutomated: false, testPlanIds: ["ignored"] },
      take: 10,
    });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testPoints/search" });
    expect(client.calls[0].body).toEqual({ isAutomated: false, testPlanIds: ["tp"], statuses: ["NoResults"] });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 10 });
  });

  it("tree, get, points and delete hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("list_test_plan_test_suites", { testPlanId: "tp" });
    await call("get_test_suite", { id: "s1" });
    await call("list_test_suite_test_points", { id: "s1" });
    await call("delete_test_suite", { id: "s1" });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /api/v2/testPlans/tp/testSuites",
      "GET /api/v2/testSuites/s1",
      "GET /api/v2/testSuites/s1/testPoints",
      "DELETE /api/v2/testSuites/s1",
    ]);
  });
});
