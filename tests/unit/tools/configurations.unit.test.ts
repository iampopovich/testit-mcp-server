import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("configuration tools", () => {
  it("create_configuration fills required defaults", async () => {
    const { client, call } = setup();
    await call("create_configuration", { projectId: "p1", name: "Firefox", parameters: { browser: "firefox" } });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/configurations",
      body: { projectId: "p1", name: "Firefox", parameters: { browser: "firefox" }, isDefault: false },
    });
    await expect(call("create_configuration", { projectId: "p1" })).rejects.toThrow('"name" is required.');
  });

  it("set_configuration sends JSON Patch for given fields only", async () => {
    const { client, call } = setup();
    await call("set_configuration", { id: "c1", name: "Chrome" });
    expect(client.calls[0]).toMatchObject({
      method: "PATCH",
      path: "/api/v2/configurations/c1",
      body: [{ op: "replace", path: "/name", value: "Chrome" }],
    });
    await expect(call("set_configuration", { id: "c1" })).rejects.toThrow("Nothing to update");
  });

  it("delete/restore/purge hit the right endpoints", async () => {
    const { client, call } = setup();
    for (const name of ["delete_configuration", "restore_configuration", "purge_configuration"]) {
      await call(name, { id: "c1" });
    }
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "DELETE /api/v2/configurations/c1",
      "POST /api/v2/configurations/c1/restore",
      "POST /api/v2/configurations/c1/purge",
    ]);
  });
});

describe("dictionary tools", () => {
  it("list_test_statuses unwraps the data envelope", async () => {
    const { client, call } = setup();
    client.responses.set("POST /api/v2/testStatuses/search", { data: [{ code: "PASSED" }], totalCount: 1 });
    expect(await call("list_test_statuses", {})).toEqual([{ code: "PASSED" }]);
  });

  it("list_tags: project mode vs instance search with default searchField", async () => {
    const { client, call } = setup();
    await call("list_tags", { projectId: "p1" });
    await call("list_tags", { searchValue: "smoke", take: 5 });
    expect(client.calls[0]).toMatchObject({ method: "GET", path: "/api/v2/projects/p1/workItems/tags" });
    expect(client.calls[1]).toMatchObject({ method: "GET", path: "/api/v2/tags/search" });
    expect(definedQuery(client.calls[1].query)).toEqual({ Take: 5, SearchField: "name", SearchValue: "smoke" });
  });

  it("list_project_attributes passes isDeleted", async () => {
    const { client, call } = setup();
    await call("list_project_attributes", { projectId: "p1", isDeleted: false });
    expect(client.calls[0]).toMatchObject({ method: "GET", path: "/api/v2/projects/p1/attributes" });
    expect(definedQuery(client.calls[0].query)).toEqual({ isDeleted: false });
  });
});
