import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

interface Attribute {
  id: string;
  name: string;
  type: string;
  isGlobal: boolean;
  isRequired: boolean;
  isDeleted: boolean;
  options: Array<{ id: string; value: string; isDefault: boolean }>;
}

/**
 * Attributes cannot be purged via API: every run leaves 3 archived attributes behind,
 * so the whole admin flow is covered by one test with the minimum of entities.
 */
describe.skipIf(!integrationEnabled)("integration: custom attributes (admin toolset)", () => {
  const prefix = uniqueName("attr");
  const globals: string[] = [];
  let projectAttributeId: string | undefined;
  let templateId: string | undefined;
  let workItemId: string | undefined;

  afterAll(async () => {
    await removeWorkItem(workItemId);
    await callSafe("unlink_project_attribute_template", { templateId });
    await callSafe("delete_attribute_template", { id: templateId });
    for (const id of globals) {
      await callSafe("unlink_test_plan_attribute", { id });
      await callSafe("delete_project_attribute", { id });
      await callSafe("delete_global_attribute", { id });
    }
    await callSafe("delete_project_attribute", { id: projectAttributeId });
  });

  it("global attributes, test plan attributes, templates, project attribute in a work item", async () => {
    // Global attributes
    const env = await callTool<Attribute>("create_global_attribute", {
      name: `${prefix}-env`,
      type: "options",
      options: ["dev", "prod"],
      defaultOption: "prod",
    });
    globals.push(env.id);
    const owner = await callTool<Attribute>("create_global_attribute", { name: `${prefix}-owner`, type: "string" });
    globals.push(owner.id);
    const team = await callTool<Attribute>("create_global_attribute", { name: `${prefix}-team`, type: "string" });
    globals.push(team.id);

    await callTool("set_global_attribute", { id: env.id, isRequired: true });
    const envNow = await callTool<Attribute>("get_custom_attribute", { id: env.id });
    expect(envNow).toMatchObject({ isGlobal: true, isRequired: true });
    expect(envNow.options.map((o) => [o.value, o.isDefault])).toEqual([
      ["dev", false],
      ["prod", true],
    ]);
    const found = await callTool<Attribute[]>("search_custom_attributes", { name: prefix });
    expect(found.map((a) => a.id).sort()).toEqual([...globals].sort());

    // Link to the project
    await callTool("link_project_global_attributes", { attributeIds: [owner.id] });
    let projectAttrs = await callTool<Attribute[]>("list_project_attributes", {});
    expect(projectAttrs.map((a) => a.id)).toContain(owner.id);
    await callTool("delete_project_attribute", { id: owner.id }); // global -> only detached
    projectAttrs = await callTool<Attribute[]>("list_project_attributes", {});
    expect(projectAttrs.map((a) => a.id)).not.toContain(owner.id);
    expect((await callTool<Attribute>("get_custom_attribute", { id: owner.id })).isDeleted).toBe(false);

    // Test plan attributes
    await callTool("link_test_plan_attributes", { attributeIds: [env.id] });
    await callTool("set_test_plan_attribute", { id: env.id, isEnabled: true, isRequired: false });
    const planAttrs = await callTool<Attribute[]>("list_test_plan_attributes", {});
    expect(planAttrs.find((a) => a.id === env.id)).toMatchObject({ isRequired: false });
    await callTool("unlink_test_plan_attribute", { id: env.id });
    expect((await callTool<Attribute[]>("list_test_plan_attributes", {})).map((a) => a.id)).not.toContain(env.id);

    // Templates (excluding below 2 attributes deletes the template, so use 3)
    const template = await callTool<{ id: string }>("create_attribute_template", {
      name: `${prefix}-tpl`,
      attributeIds: globals,
    });
    templateId = template.id;
    await callTool("unlink_attribute_template_attributes", { id: template.id, attributeIds: [team.id] });
    let templates = await callTool<Array<{ id: string; customAttributeModels: Attribute[] }>>(
      "search_attribute_templates",
      { name: `${prefix}-tpl` },
    );
    expect(templates[0].customAttributeModels.map((a) => a.id).sort()).toEqual([env.id, owner.id].sort());
    await callTool("link_attribute_template_attributes", { id: template.id, attributeIds: [team.id] });
    templates = await callTool("search_attribute_templates", { name: `${prefix}-tpl` });
    expect(templates[0].customAttributeModels.map((a) => a.id).sort()).toEqual([...globals].sort());

    await callTool("link_project_attribute_template", { templateId: template.id });
    expect((await callTool<Array<{ id: string }>>("list_project_attribute_templates", {})).map((t) => t.id)).toContain(
      template.id,
    );
    projectAttrs = await callTool<Attribute[]>("list_project_attributes", {});
    expect(projectAttrs.map((a) => a.id)).toEqual(expect.arrayContaining(globals));
    await callTool("unlink_project_attribute_template", { templateId: template.id });
    projectAttrs = await callTool<Attribute[]>("list_project_attributes", {});
    expect(projectAttrs.map((a) => a.id)).not.toContain(env.id);

    // Project attribute used by a work item
    const local = await callTool<Attribute>("create_project_attribute", { name: `${prefix}-local`, type: "string" });
    projectAttributeId = local.id;
    await callTool("set_project_attribute", { id: local.id, name: `${prefix}-local2` });
    expect(await callTool("get_project_attribute", { id: local.id })).toMatchObject({
      name: `${prefix}-local2`,
      type: "string",
      isGlobal: false,
    });
    const wi = await callTool<{ id: string; attributes: Record<string, unknown> }>("create_work_item", {
      name: `${prefix}-case`,
      attributes: { [local.id]: "hello" },
    });
    workItemId = wi.id;
    expect(wi.attributes[local.id]).toBe("hello");

    await callTool("delete_global_attribute", { id: env.id });
    expect((await callTool<Attribute>("get_custom_attribute", { id: env.id })).isDeleted).toBe(true);
    expect((await callTool<Attribute[]>("search_custom_attributes", { name: prefix })).map((a) => a.id)).not.toContain(
      env.id,
    );
  });
});
