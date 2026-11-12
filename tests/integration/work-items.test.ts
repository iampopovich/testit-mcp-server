import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callTool, getProjectId, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

interface WorkItem {
  id: string;
  name: string;
  entityTypeName: string;
}

describe.skipIf(!integrationEnabled)("integration: work items listing", () => {
  const prefix = uniqueName("wi");
  let testCase: WorkItem;
  let sharedStep: WorkItem;

  beforeAll(async () => {
    testCase = await callTool<WorkItem>("create_work_item", {
      name: `${prefix}-case`,
      state: "Ready",
      tags: ["mcp-it"],
      steps: [{ action: "open", expected: "opened" }],
    });
    // No duration given: the tool must force 0 for SharedSteps (TestIT rejects anything else).
    sharedStep = await callTool<WorkItem>("create_work_item", {
      name: `${prefix}-shared`,
      entityTypeName: "SharedSteps",
      steps: [{ action: "login", expected: "logged in" }],
    });
  });

  afterAll(async () => {
    await removeWorkItem(testCase?.id);
    await removeWorkItem(sharedStep?.id);
  });

  it("delete -> restore -> delete -> purge removes the item for good", async () => {
    const temp = await callTool<WorkItem>("create_work_item", { name: `${prefix}-temp` });
    await callTool("delete_work_item", { id: temp.id });
    const archived = await callTool<WorkItem[]>("list_work_items", { name: `${prefix}-temp`, isDeleted: true });
    expect(archived.map((w) => w.id)).toEqual([temp.id]);

    await callTool("restore_work_item", { id: temp.id });
    expect((await callTool<WorkItem[]>("list_work_items", { name: `${prefix}-temp` })).map((w) => w.id)).toEqual([
      temp.id,
    ]);

    await callTool("delete_work_item", { id: temp.id });
    await callTool("purge_work_item", { id: temp.id });
    await expect(callTool("get_work_item", { id: temp.id })).rejects.toThrow("(404)");
  });

  it("create_work_item applies defaults and typed tags into the project", async () => {
    const created = await callTool<WorkItem & { duration: number; state: string; tags: Array<{ name: string }> }>(
      "get_work_item",
      { id: testCase.id },
    );
    expect(created.entityTypeName).toBe("TestCases");
    expect(created.state).toBe("Ready");
    expect(created.duration).toBe(60000);
    expect(created.tags.map((t) => t.name)).toEqual(["mcp-it"]);
  });

  it("list_work_items filters by name and type", async () => {
    const all = await callTool<WorkItem[]>("list_work_items", { name: prefix });
    expect(all.map((w) => w.id).sort()).toEqual([testCase.id, sharedStep.id].sort());

    const cases = await callTool<WorkItem[]>("list_work_items", { name: prefix, types: ["TestCases"] });
    expect(cases.map((w) => w.id)).toEqual([testCase.id]);
  });

  it("list_work_items pages through results", async () => {
    const page1 = await callTool<WorkItem[]>("list_work_items", { name: prefix, orderBy: "name", page: 1, size: 1 });
    const page2 = await callTool<WorkItem[]>("list_work_items", { name: prefix, orderBy: "name", page: 2, size: 1 });
    expect(page1).toHaveLength(1);
    expect(page2).toHaveLength(1);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it("list_shared_steps returns only shared steps", async () => {
    const steps = await callTool<WorkItem[]>("list_shared_steps", { name: prefix });
    expect(steps.map((w) => w.id)).toEqual([sharedStep.id]);
  });

  it("search_work_items finds items across projects by projectIds + name", async () => {
    const found = await callTool<WorkItem[]>("search_work_items", {
      projectIds: [getProjectId()],
      name: prefix,
      types: ["SharedSteps"],
    });
    expect(found.map((w) => w.id)).toEqual([sharedStep.id]);
  });

  it("list_projects finds the project by name", async () => {
    const project = await callTool<{ name: string }>("get_project", { id: getProjectId() });
    const found = await callTool<Array<{ id: string }>>("list_projects", { name: project.name });
    expect(found.map((p) => p.id)).toContain(getProjectId());
  });
});
