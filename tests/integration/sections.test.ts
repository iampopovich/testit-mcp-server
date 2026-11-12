import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

interface Section {
  id: string;
  name: string;
  parentId: string | null;
  isDeleted?: boolean;
}

describe.skipIf(!integrationEnabled)("integration: sections", () => {
  const prefix = uniqueName("sec");
  let parent: Section | undefined;
  let workItemId: string | undefined;

  afterAll(async () => {
    await removeWorkItem(workItemId);
    // Deleting the parent archives the child section too.
    await callSafe("delete_section", { id: parent?.id });
  });

  it("create (root default) -> nested create -> rename -> move -> work item in section -> delete", async () => {
    const sections = await callTool<Section[]>("list_sections", {});
    const root = sections.find((s) => s.parentId === null)!;

    parent = await callTool<Section>("create_section", { name: `${prefix}-parent` });
    expect(parent.parentId).toBe(root.id);

    const child = await callTool<Section>("create_section", { name: `${prefix}-child` });
    await callTool("rename_section", { id: child.id, name: `${prefix}-renamed` });
    await callTool("move_section", { id: child.id, parentId: parent.id });
    const moved = await callTool<Section>("get_section", { id: child.id });
    expect(moved).toMatchObject({ name: `${prefix}-renamed`, parentId: parent.id });

    const wi = await callTool<{ id: string; sectionId: string }>("create_work_item", {
      name: `${prefix}-case`,
      sectionId: child.id,
    });
    workItemId = wi.id;
    expect(wi.sectionId).toBe(child.id);
    const inSection = await callTool<Array<{ id: string }>>("list_work_items", { sectionIds: [child.id] });
    expect(inSection.map((w) => w.id)).toEqual([wi.id]);

    await callTool("delete_section", { id: parent.id });
    await expect(callTool("get_section", { id: child.id })).rejects.toThrow("(404)");
    expect((await callTool<Section>("get_section", { id: parent.id, isDeleted: true })).isDeleted).toBe(true);
    parent = undefined;
  });
});
