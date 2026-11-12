import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("iteration 19 tools", () => {
  it("set_project / set_autotest send replace ops and reject empty updates", async () => {
    const { client, call } = setup();
    await call("set_project", { id: "p1", description: "d" });
    await call("set_autotest", { id: "a1", namespace: "ns" });
    expect(client.calls[0]).toMatchObject({
      method: "PATCH",
      path: "/api/v2/projects/p1",
      body: [{ op: "replace", path: "/description", value: "d" }],
    });
    expect(client.calls[1]).toMatchObject({
      method: "PATCH",
      path: "/api/v2/autoTests/a1",
      body: [{ op: "replace", path: "/namespace", value: "ns" }],
    });
    await expect(call("set_project", { id: "p1" })).rejects.toThrow("Nothing to update");
    await expect(call("set_autotest", { id: "a1" })).rejects.toThrow("Nothing to update");
  });

  it("namespaces, work item autotests and shared step references hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("list_project_autotest_namespaces", { projectId: "p1" });
    await call("list_work_item_autotests", { id: "w1" });
    await call("unlink_work_item_autotests", { id: "w1" });
    await call("list_shared_step_references", { id: "s1" });
    await call("list_shared_step_references", { id: "s1", target: "sections", take: 2 });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /api/v2/projects/p1/autoTestsNamespaces",
      "GET /api/v2/workItems/w1/autoTests",
      "DELETE /api/v2/workItems/w1/autoTests",
      "POST /api/v2/workItems/s1/references/workItems",
      "POST /api/v2/workItems/s1/references/sections",
    ]);
    expect(definedQuery(client.calls[4].query)).toEqual({ Take: 2 });
    await expect(call("list_shared_step_references", { id: "s1", target: "x" })).rejects.toThrow('"target" must be');
  });
});
