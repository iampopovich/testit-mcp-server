import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("work item listing tools", () => {
  it("list_work_items searches inside the project with a typed filter", async () => {
    const { client, call } = setup();
    await call("list_work_items", {
      projectId: "p1",
      name: "login",
      types: ["TestCases"],
      tags: ["smoke"],
      isDeleted: false,
      page: 2,
      size: 10,
    });
    expect(client.calls).toHaveLength(1);
    const [req] = client.calls;
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/api/v2/projects/p1/workItems/search");
    expect(req.body).toEqual({
      filter: { name: "login", types: ["TestCases"], tags: ["smoke"], isDeleted: false },
    });
    expect(definedQuery(req.query)).toEqual({ Skip: 10, Take: 10 });
  });

  it("list_work_items sends an empty filter when no filters given", async () => {
    const { client, call } = setup();
    await call("list_work_items", { projectId: "p1" });
    expect(client.calls[0].body).toEqual({ filter: {} });
  });

  it("list_shared_steps always restricts types to SharedSteps", async () => {
    const { client, call } = setup();
    await call("list_shared_steps", { projectId: "p1", name: "auth", types: ["TestCases"] });
    expect(client.calls[0].path).toBe("/api/v2/projects/p1/workItems/search");
    expect(client.calls[0].body).toEqual({ filter: { name: "auth", types: ["SharedSteps"] } });
  });

  it("search_work_items wraps typed fields into {filter} (raw body was silently ignored)", async () => {
    const { client, call } = setup();
    await call("search_work_items", {
      projectIds: ["p1"],
      nameOrId: "42",
      types: ["CheckLists"],
      filter: { createdDate: { from: "2026-01-01" } },
      take: 3,
    });
    const [req] = client.calls;
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/api/v2/workItems/search");
    expect(req.body).toEqual({
      filter: {
        createdDate: { from: "2026-01-01" },
        types: ["CheckLists"],
        projectIds: ["p1"],
        nameOrId: "42",
      },
    });
    expect(definedQuery(req.query)).toEqual({ Take: 3 });
  });

  it("search_work_items accepts legacy query arg with or without filter wrapper", async () => {
    const { client, call } = setup();
    await call("search_work_items", { query: { name: "a" } });
    await call("search_work_items", { query: { filter: { name: "b" } } });
    expect(client.calls[0].body).toEqual({ filter: { name: "a" } });
    expect(client.calls[1].body).toEqual({ filter: { name: "b" } });
  });

  it("list_projects uses POST /projects/search with a filter", async () => {
    const { client, call } = setup();
    await call("list_projects", { name: "sigma", isDeleted: false, take: 5 });
    expect(client.calls[0].method).toBe("POST");
    expect(client.calls[0].path).toBe("/api/v2/projects/search");
    expect(client.calls[0].body).toEqual({ name: "sigma", isDeleted: false });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 5 });
  });
});
