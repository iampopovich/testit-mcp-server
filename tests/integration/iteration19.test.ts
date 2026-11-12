import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getClient, getProjectId, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

describe.skipIf(!integrationEnabled)("integration: project patch, autotest patch, links, shared step refs", () => {
  const prefix = uniqueName("it19");
  const created: string[] = [];
  let autoTestId: string | undefined;

  beforeAll(async () => {
    autoTestId = (
      await callTool<{ id: string }>("create_autotest", {
        externalId: `${prefix}-ext`,
        name: prefix,
        namespace: `${prefix}.ns`,
        classname: "Cls",
      })
    ).id;
  });

  afterAll(async () => {
    await callSafe("delete_autotest", { id: autoTestId });
    // Reverse order: a shared step cannot be deleted while a case still references it.
    for (const id of [...created].reverse()) {
      await removeWorkItem(id);
    }
  });

  it("set_project changes only the description (restored afterwards)", async () => {
    const before = await callTool<{ name: string; description: string | null }>("get_project", { id: getProjectId() });
    try {
      await callTool("set_project", { id: getProjectId(), description: prefix });
      const after = await callTool<{ name: string; description: string | null }>("get_project", { id: getProjectId() });
      expect(after).toMatchObject({ name: before.name, description: prefix });
    } finally {
      // Restore the exact previous value (may be null, which set_project cannot send).
      await getClient().patch(`/api/v2/projects/${getProjectId()}`, [
        { op: "replace", path: "/description", value: before.description },
      ]);
    }
  });

  it("namespaces list and set_autotest", async () => {
    const namespaces = await callTool<Array<{ name: string; classes: string[] }>>("list_project_autotest_namespaces", {});
    expect(namespaces).toContainEqual({ name: `${prefix}.ns`, classes: ["Cls"] });

    await callTool("set_autotest", { id: autoTestId, name: `${prefix}-v2`, namespace: `${prefix}.ns2` });
    expect(await callTool("get_autotest", { id: autoTestId })).toMatchObject({
      name: `${prefix}-v2`,
      namespace: `${prefix}.ns2`,
      classname: "Cls",
      externalId: `${prefix}-ext`,
    });
  });

  it("work item autotests: list -> unlink all -> manual", async () => {
    const wi = await callTool<{ id: string }>("create_work_item", { name: `${prefix}-case` });
    created.push(wi.id);
    await callTool("link_autotest_work_item", { id: autoTestId, workItemId: wi.id });
    const linked = await callTool<Array<{ id: string }>>("list_work_item_autotests", { id: wi.id });
    expect(linked.map((a) => a.id)).toEqual([autoTestId]);

    await callTool("unlink_work_item_autotests", { id: wi.id });
    expect(await callTool("list_work_item_autotests", { id: wi.id })).toEqual([]);
    expect((await callTool<{ isAutomated: boolean }>("get_work_item", { id: wi.id })).isAutomated).toBe(false);
  });

  it("list_shared_step_references finds the case that uses the shared step", async () => {
    const shared = await callTool<{ id: string }>("create_work_item", {
      name: `${prefix}-shared`,
      entityTypeName: "SharedSteps",
      steps: [{ action: "login" }],
    });
    created.push(shared.id);
    const user = await callTool<{ id: string }>("create_work_item", {
      name: `${prefix}-uses-shared`,
      steps: [{ workItemId: shared.id }],
    });
    created.push(user.id);

    const refs = await callTool<Array<{ id: string }>>("list_shared_step_references", { id: shared.id });
    expect(refs.map((r) => r.id)).toEqual([user.id]);
    expect(Array.isArray(await callTool("list_shared_step_references", { id: shared.id, target: "sections" }))).toBe(
      true,
    );
  });
});
