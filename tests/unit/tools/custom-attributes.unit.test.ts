import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never, { toolsets: ["admin"] });
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("custom attribute admin tools", () => {
  it("create_global_attribute builds options with a default and flag defaults", async () => {
    const { client, call } = setup();
    await call("create_global_attribute", { name: "Env", type: "options", options: ["dev", "prod"], defaultOption: "prod" });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/customAttributes/global",
      body: {
        name: "Env",
        type: "options",
        isEnabled: true,
        isRequired: false,
        options: [
          { value: "dev", isDefault: false },
          { value: "prod", isDefault: true },
        ],
      },
    });
    await expect(call("create_global_attribute", { name: "x", type: "bogus" })).rejects.toThrow('"type" must be one of');
  });

  it("set_global_attribute reads the attribute and keeps its options", async () => {
    const { client, call } = setup();
    const options = [{ id: "o1", value: "a", isDefault: true, isDeleted: false }];
    client.responses.set("GET /api/v2/customAttributes/g1", { id: "g1", name: "A", isEnabled: true, isRequired: false, options });
    await call("set_global_attribute", { id: "g1", isRequired: true });
    expect(client.calls[1]).toMatchObject({
      method: "PUT",
      path: "/api/v2/customAttributes/global/g1",
      body: { name: "A", isEnabled: true, isRequired: true, options },
    });
    await expect(call("set_global_attribute", { id: "g1" })).rejects.toThrow("Nothing to update");
  });

  it("set_project_attribute sends the full PUT model with changes merged", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/projects/p1/attributes/a1", {
      id: "a1",
      name: "Old",
      type: "string",
      options: [],
      isEnabled: true,
      isRequired: false,
      isGlobal: false,
      isDeleted: false,
    });
    await call("set_project_attribute", { projectId: "p1", id: "a1", name: "New" });
    expect(client.calls[1]).toMatchObject({
      method: "PUT",
      path: "/api/v2/projects/p1/attributes",
      body: { id: "a1", name: "New", type: "string", isGlobal: false, isDeleted: false },
    });
  });

  it("link/unlink and template endpoints", async () => {
    const { client, call } = setup();
    await call("link_project_global_attributes", { projectId: "p1", attributeIds: ["g1"] });
    await call("link_test_plan_attributes", { projectId: "p1", attributeIds: ["g1"] });
    await call("set_test_plan_attribute", { projectId: "p1", id: "g1", isEnabled: true, isRequired: false });
    await call("unlink_test_plan_attribute", { projectId: "p1", id: "g1" });
    await call("link_attribute_template_attributes", { id: "t1", attributeIds: ["g2"] });
    await call("unlink_attribute_template_attributes", { id: "t1", attributeIds: ["g2"] });
    await call("link_project_attribute_template", { projectId: "p1", templateId: "t1" });
    await call("unlink_project_attribute_template", { projectId: "p1", templateId: "t1" });
    expect(client.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/projects/p1/globalAttributes",
      "POST /api/v2/projects/p1/testPlans/attributes",
      "PUT /api/v2/projects/p1/testPlans/attributes",
      "DELETE /api/v2/projects/p1/testPlans/attributes/g1",
      "POST /api/v2/customAttributes/templates/t1/customAttributes/include",
      "POST /api/v2/customAttributes/templates/t1/customAttributes/exclude",
      "POST /api/v2/projects/p1/attributes/templates/t1",
      "DELETE /api/v2/projects/p1/attributes/templates/t1",
    ]);
    expect(client.calls[0].body).toEqual(["g1"]);
    await expect(call("create_attribute_template", { name: "T", attributeIds: ["g1"] })).rejects.toThrow("at least 2");
  });

  it("search_custom_attributes defaults to active attributes", async () => {
    const { client, call } = setup();
    await call("search_custom_attributes", { name: "Env" });
    expect(client.calls[0].body).toEqual({ name: "Env", isDeleted: false });
  });
});
