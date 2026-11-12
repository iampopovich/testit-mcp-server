import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("test plan tools", () => {
  it("create_test_plan builds a typed body with tag models", async () => {
    const { client, call } = setup();
    await call("create_test_plan", { projectId: "p1", name: "Release 1", build: "1.0", tags: ["rc"] });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testPlans",
      body: { projectId: "p1", name: "Release 1", build: "1.0", tags: [{ name: "rc" }] },
    });
  });

  it("create_test_plan requires a name (typed or in payload)", async () => {
    const { client, call } = setup();
    await expect(call("create_test_plan", { projectId: "p1" })).rejects.toThrow('"name" is required.');
    await call("create_test_plan", { payload: { projectId: "legacy", name: "x" } });
    expect(client.calls[0].body).toEqual({ projectId: "legacy", name: "x" });
  });

  it("set_test_plan_state maps actions to endpoints and validates them", async () => {
    const { client, call } = setup();
    for (const action of ["start", "pause", "complete"]) {
      await call("set_test_plan_state", { id: "tp", action });
    }
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/testPlans/tp/start",
      "POST /api/v2/testPlans/tp/pause",
      "POST /api/v2/testPlans/tp/complete",
    ]);
    await expect(call("set_test_plan_state", { id: "tp", action: "stop" })).rejects.toThrow(
      '"action" must be one of: start, pause, complete.',
    );
  });

  it("clone, restore, purge and test runs listing hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("create_test_plan_clone", { id: "tp" });
    await call("restore_test_plan", { id: "tp" });
    await call("purge_test_plan", { id: "tp" });
    await call("list_test_plan_test_runs", { id: "tp", completed: true, take: 5 });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/testPlans/tp/clone",
      "POST /api/v2/testPlans/tp/restore",
      "POST /api/v2/testPlans/tp/purge",
      "GET /api/v2/testPlans/tp/testRuns",
    ]);
    expect(definedQuery(client.calls[3].query)).toEqual({ completed: true, Take: 5 });
  });
});

describe("test plan testers, reset and reports", () => {
  it("assign/unassign send an explicit include selection", async () => {
    const { client, call } = setup();
    await call("assign_test_points_tester", { id: "tp", userId: "u1", testPointIds: ["p1"] });
    await call("unassign_test_points_tester", { id: "tp", testPointIds: ["p1"] });
    const selection = { extractionModel: { ids: { include: ["p1"] } } };
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testPlans/tp/testPoints/tester/u1", body: selection });
    expect(client.calls[1]).toMatchObject({ method: "DELETE", path: "/api/v2/testPlans/tp/testPoints/tester", body: selection });
  });

  it("refuses empty point lists (TestIT would apply to ALL points)", async () => {
    const { client, call } = setup();
    for (const name of ["assign_test_points_tester", "unassign_test_points_tester", "reset_test_points"]) {
      await expect(call(name, { id: "tp", userId: "u1", testPointIds: [] })).rejects.toThrow('"testPointIds" must be a non-empty');
    }
    expect(client.calls).toHaveLength(0);
  });

  it("reset, summary, configurations, history hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("reset_test_points", { id: "tp", testPointIds: ["p1"] });
    await call("get_test_plan_summary", { id: "tp" });
    await call("list_test_plan_configurations", { id: "tp" });
    await call("get_test_plan_history", { id: "tp", take: 3 });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/testPlans/tp/testPoints/reset",
      "GET /api/v2/testPlans/tp/summaries",
      "GET /api/v2/testPlans/tp/configurations",
      "GET /api/v2/testPlans/tp/history",
    ]);
    expect(client.calls[0].body).toEqual(["p1"]);
  });
});
