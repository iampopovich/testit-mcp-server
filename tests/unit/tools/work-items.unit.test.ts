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

  it("create_work_item builds a valid body with defaults", async () => {
    const { client, call } = setup();
    await call("create_work_item", { projectId: "p1", name: "Login", tags: ["smoke"] });
    expect(client.calls[0].method).toBe("POST");
    expect(client.calls[0].path).toBe("/api/v2/workItems");
    expect(client.calls[0].body).toEqual({
      projectId: "p1",
      name: "Login",
      entityTypeName: "TestCases",
      state: "NotReady",
      priority: "Medium",
      duration: 60000,
      tags: [{ name: "smoke" }],
    });
  });

  it("create_work_item forces duration 0 for shared steps and merges raw payload", async () => {
    const { client, call } = setup();
    await call("create_work_item", {
      projectId: "p1",
      name: "Auth",
      entityTypeName: "SharedSteps",
      duration: 5000,
      payload: { links: [{ url: "https://x" }], name: "ignored" },
    });
    expect(client.calls[0].body).toMatchObject({
      name: "Auth",
      entityTypeName: "SharedSteps",
      duration: 0,
      links: [{ url: "https://x" }],
    });
  });

  it("create_work_item requires a name", async () => {
    const { call } = setup();
    await expect(call("create_work_item", { projectId: "p1" })).rejects.toThrow('"name" is required.');
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

describe("work item edit tools", () => {
  it("set_work_item builds replace operations for given fields only", async () => {
    const { client, call } = setup();
    await call("set_work_item", { id: "w1", state: "Ready", tags: ["smoke"] });
    expect(client.calls[0]).toMatchObject({
      method: "PATCH",
      path: "/api/v2/workItems/w1",
      body: [
        { op: "replace", path: "/state", value: "Ready" },
        { op: "replace", path: "/tags", value: [{ name: "smoke" }] },
      ],
    });
    await expect(call("set_work_item", { id: "w1" })).rejects.toThrow("Nothing to update");
  });

  it("move_work_item maps sectionId to newSectionId", async () => {
    const { client, call } = setup();
    await call("move_work_item", { id: "w1", sectionId: "s2" });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/workItems/move",
      body: { id: "w1", newSectionId: "s2" },
    });
  });

  it("comment tools hit the comment endpoints", async () => {
    const { client, call } = setup();
    await call("create_work_item_comment", { workItemId: "w1", text: "hi" });
    await call("update_work_item_comment", { commentId: "c1", text: "hey" });
    await call("list_work_item_comments", { id: "w1" });
    await call("delete_work_item_comment", { commentId: "c1" });
    expect(client.calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ["POST", "/api/v2/workItems/comments", { workItemId: "w1", text: "hi" }],
      ["PUT", "/api/v2/workItems/comments", { id: "c1", text: "hey" }],
      ["GET", "/api/v2/workItems/w1/comments", undefined],
      ["DELETE", "/api/v2/workItems/comments/c1", undefined],
    ]);
  });

  it("get_work_item_test_results_history passes filters as query", async () => {
    const { client, call } = setup();
    await call("get_work_item_test_results_history", { id: "w1", testPlanIds: ["tp"], take: 10 });
    expect(client.calls[0].path).toBe("/api/v2/workItems/w1/testResults/history");
    expect(definedQuery(client.calls[0].query)).toEqual({ testPlanIds: ["tp"], Take: 10 });
  });
});
