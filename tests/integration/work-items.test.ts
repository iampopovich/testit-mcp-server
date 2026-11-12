import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getProjectId, integrationEnabled, uniqueName } from "./setup.js";

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
      payload: {
        projectId: getProjectId(),
        name: `${prefix}-case`,
        entityTypeName: "TestCases",
        state: "Ready",
        priority: "Medium",
        duration: 1000,
        steps: [{ action: "open", expected: "opened" }],
      },
    });
    sharedStep = await callTool<WorkItem>("create_work_item", {
      payload: {
        projectId: getProjectId(),
        name: `${prefix}-shared`,
        entityTypeName: "SharedSteps",
        state: "Ready",
        priority: "Medium",
        duration: 0,
        steps: [{ action: "login", expected: "logged in" }],
      },
    });
  });

  afterAll(async () => {
    await callSafe("delete_work_item", { id: testCase?.id });
    await callSafe("delete_work_item", { id: sharedStep?.id });
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
