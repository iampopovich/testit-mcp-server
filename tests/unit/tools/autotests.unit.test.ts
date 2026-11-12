import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("autotest tools", () => {
  it("create_autotest maps workItemIds to workItemIdsForLinkWithAutoTest", async () => {
    const { client, call } = setup();
    await call("create_autotest", {
      projectId: "p1",
      externalId: "login.test",
      name: "Login works",
      namespace: "auth",
      workItemIds: ["w1"],
      payload: { isFlaky: false },
    });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/autoTests" });
    expect(client.calls[0].body).toEqual({
      isFlaky: false,
      externalId: "login.test",
      name: "Login works",
      namespace: "auth",
      workItemIdsForLinkWithAutoTest: ["w1"],
      projectId: "p1",
    });
  });

  it("search_autotests wraps the filter and scopes to the project", async () => {
    const { client, call } = setup();
    await call("search_autotests", { projectId: "p1", externalIds: ["x"], includes: { includeSteps: true }, take: 3 });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/autoTests/search" });
    expect(client.calls[0].body).toEqual({
      filter: { projectIds: ["p1"], externalIds: ["x"] },
      includes: { includeSteps: true },
    });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 3 });
  });

  it("link/unlink use body id and workItemId query param", async () => {
    const { client, call } = setup();
    await call("link_autotest_work_item", { id: "a1", workItemId: "w1" });
    await call("unlink_autotest_work_item", { id: "a1", workItemId: "w1" });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/autoTests/a1/workItems", body: { id: "w1" } });
    expect(client.calls[1]).toMatchObject({ method: "DELETE", path: "/api/v2/autoTests/a1/workItems" });
    expect(definedQuery(client.calls[1].query)).toEqual({ workItemId: "w1" });
  });

  it("create_test_run_from_work_items builds byWorkItems body and validates arrays", async () => {
    const { client, call } = setup();
    await call("create_test_run_from_work_items", {
      projectId: "p1",
      testPlanId: "tp",
      workItemIds: ["w1"],
      configurationIds: ["c1"],
      name: "Nightly",
    });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/byWorkItems",
      body: { projectId: "p1", testPlanId: "tp", workItemIds: ["w1"], configurationIds: ["c1"], name: "Nightly" },
    });
    await expect(
      call("create_test_run_from_work_items", { projectId: "p1", testPlanId: "tp", workItemIds: [], configurationIds: ["c"] }),
    ).rejects.toThrow('"workItemIds" must be a non-empty array');
  });
});
