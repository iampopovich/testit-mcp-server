import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("section tools", () => {
  it("create_section defaults parentId to the project's root section", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/projects/p1/sections", [
      { id: "child", parentId: "root" },
      { id: "root", parentId: null },
    ]);
    await call("create_section", { projectId: "p1", name: "Login" });
    expect(client.calls[1]).toMatchObject({
      method: "POST",
      path: "/api/v2/sections",
      body: { projectId: "p1", name: "Login", parentId: "root", attachments: [] },
    });
  });

  it("create_section uses an explicit parentId without listing sections", async () => {
    const { client, call } = setup();
    await call("create_section", { projectId: "p1", name: "Sub", parentId: "s1", preconditionSteps: [{ action: "a" }] });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].body).toEqual({
      projectId: "p1",
      name: "Sub",
      parentId: "s1",
      attachments: [],
      preconditionSteps: [{ action: "a" }],
    });
  });

  it("move_section looks up the current parent", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/sections/s1", { id: "s1", parentId: "old" });
    await call("move_section", { id: "s1", parentId: "new" });
    expect(client.calls[1]).toMatchObject({
      method: "POST",
      path: "/api/v2/sections/move",
      body: { id: "s1", oldParentId: "old", parentId: "new" },
    });
  });

  it("move_section refuses to move the root section", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/sections/root", { id: "root", parentId: null });
    await expect(call("move_section", { id: "root", parentId: "x" })).rejects.toThrow("root section cannot be moved");
  });

  it("rename_section and delete_section hit the right endpoints", async () => {
    const { client, call } = setup();
    await call("rename_section", { id: "s1", name: "New" });
    await call("delete_section", { id: "s1" });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/sections/rename", body: { id: "s1", name: "New" } });
    expect(client.calls[1]).toMatchObject({ method: "DELETE", path: "/api/v2/sections/s1" });
  });
});
