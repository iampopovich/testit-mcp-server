import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never, { toolsets: ["bulk"] });
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

const pick = (ids: string[], filter: Record<string, unknown>) => ({
  extractionModel: { ids: { include: ids } },
  filter,
});

describe("bulk tools", () => {
  it("every bulk tool refuses an empty id list", async () => {
    const { client, call } = setup();
    for (const name of ["delete_test_runs", "purge_test_plans", "restore_configurations", "delete_autotests"]) {
      await expect(call(name, { projectId: "p1", ids: [] })).rejects.toThrow('"ids" must be a non-empty');
    }
    expect(client.calls).toHaveLength(0);
  });

  it("test runs: DELETE with body, restore/purge bulk", async () => {
    const { client, call } = setup();
    for (const name of ["delete_test_runs", "restore_test_runs", "purge_test_runs"]) {
      await call(name, { projectId: "p1", ids: ["r1"] });
    }
    expect(client.calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ["DELETE", "/api/v2/testRuns", pick(["r1"], { projectIds: ["p1"] })],
      ["POST", "/api/v2/testRuns/restore/bulk", pick(["r1"], { projectIds: ["p1"] })],
      ["POST", "/api/v2/testRuns/purge/bulk", pick(["r1"], { projectIds: ["p1"] })],
    ]);
  });

  it("test plans and configurations hit their bulk endpoints", async () => {
    const { client, call } = setup();
    await call("delete_test_plans", { projectId: "p1", ids: ["t1"] });
    await call("purge_configurations", { projectId: "p1", ids: ["c1"] });
    await call("delete_autotests", { projectId: "p1", ids: ["a1"] });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/projects/p1/testPlans/delete/bulk",
      "POST /api/v2/configurations/purge/bulk",
      "DELETE /api/v2/autoTests",
    ]);
    expect(client.calls[0].body).toEqual(pick(["t1"], {}));
    expect(client.calls[2].body).toEqual({ autoTestSelect: pick(["a1"], { projectIds: ["p1"] }) });
  });

  it("set_test_runs maps tags to TagApiModel and validates the action", async () => {
    const { client, call } = setup();
    await call("set_test_runs", { projectId: "p1", ids: ["r1"], tagsAction: "Add", tags: ["smoke"], description: "d" });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/updateMultiple",
      body: {
        selectModel: pick(["r1"], { projectIds: ["p1"] }),
        description: "d",
        tagUpdateScheme: { action: "Add", tags: [{ name: "smoke" }] },
      },
    });
    await call("set_test_runs", { projectId: "p1", ids: ["r1"], tagsAction: "ClearAll" });
    expect(client.calls[1].body).toMatchObject({ tagUpdateScheme: { action: "ClearAll", tags: [] } });
    await expect(call("set_test_runs", { projectId: "p1", ids: ["r1"], tagsAction: "Add" })).rejects.toThrow(
      '"tags" is required',
    );
    await expect(call("set_test_runs", { projectId: "p1", ids: ["r1"] })).rejects.toThrow("Nothing to update");
  });
});
