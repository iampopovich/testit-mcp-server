/**
 * Live coverage for tools no other integration test calls, plus negative paths
 * (validation and readable API errors) that only make sense against a real instance.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callSafe,
  callTool,
  getDefaultConfigurationId,
  getProjectId,
  integrationEnabled,
  removeTestRun,
  removeWorkItem,
  uniqueName,
} from "./setup.js";

const MISSING_UUID = "00000000-0000-0000-0000-000000000001";

interface WorkItem {
  id: string;
  name: string;
  versionNumber: number;
  entityTypeName: string;
  state: string;
  priority: string;
  sectionId: string;
  attachments: Array<{ id: string; name: string; size: number }>;
}

async function removeTestPlan(id: string | undefined): Promise<void> {
  if (!id) return;
  await callSafe("delete_test_plan", { id });
  await callSafe("purge_test_plan", { id });
}

describe.skipIf(!integrationEnabled)("integration: coverage gaps", () => {
  const prefix = uniqueName("gaps");
  let workItemId: string | undefined;
  let sharedStepId: string | undefined;
  let planId: string | undefined;
  let runId: string | undefined;
  let configurationId: string | undefined;
  let autoTestId: string | undefined;

  beforeAll(async () => {
    workItemId = (
      await callTool<WorkItem>("create_work_item", {
        name: `${prefix}-wi`,
        steps: [{ action: "open", expected: "opened" }],
      })
    ).id;
  });

  afterAll(async () => {
    await removeTestRun(runId);
    await callSafe("delete_autotest", { id: autoTestId });
    await removeTestPlan(planId);
    await removeWorkItem(workItemId);
    await removeWorkItem(sharedStepId);
    if (configurationId) {
      await callSafe("delete_configuration", { id: configurationId });
      await callSafe("purge_configuration", { id: configurationId });
    }
  });

  describe("projects", () => {
    it("update_project round-trips the full model without changing it", async () => {
      const before = await callTool<{ id: string; name: string; description: string | null; isFavorite: boolean }>(
        "get_project",
        { id: getProjectId() },
      );
      await callTool("update_project", {
        payload: { id: before.id, name: before.name, description: before.description, isFavorite: before.isFavorite },
      });
      const after = await callTool<typeof before>("get_project", { id: getProjectId() });
      expect({ name: after.name, description: after.description, isFavorite: after.isFavorite }).toEqual({
        name: before.name,
        description: before.description,
        isFavorite: before.isFavorite,
      });
    });

    it("create_project surfaces API errors readably (cloud project limit or duplicate name)", async () => {
      // The cloud plan's project limit is usually reached, so creation is expected to fail with 402.
      // If it ever succeeds, clean up immediately and still pass.
      try {
        const created = await callTool<{ id: string }>("create_project", { payload: { name: `${prefix}-proj` } });
        await callTool("delete_project", { id: created.id });
      } catch (error) {
        expect((error as Error).message).toMatch(/^TestIT API POST \/api\/v2\/projects failed \((402|409|400)\): \S/);
      }
    });

    it("delete_project on a missing id returns a readable 404", async () => {
      await expect(callTool("delete_project", { id: MISSING_UUID })).rejects.toThrow(
        /failed \(404\): .*Hint: Entity not found/,
      );
    });

    it("get_project_analytics returns per-plan analytics for the project", async () => {
      const rows = await callTool<Array<{ id: string; analytic: Record<string, unknown> }>>(
        "get_project_analytics",
        { take: 200 },
      );
      expect(Array.isArray(rows)).toBe(true);
      for (const row of rows) {
        expect(row.analytic).toHaveProperty("countGroupByStatus");
      }
    });
  });

  describe("work items", () => {
    it("update_work_item (PUT) -> versions grow, history records the rename", async () => {
      const full = await callTool<WorkItem>("get_work_item", { id: workItemId });
      expect(await callTool("get_work_item_versions", { id: workItemId })).toHaveLength(1);

      await callTool("update_work_item", { payload: { ...full, name: `${prefix}-wi-renamed` } });

      const after = await callTool<WorkItem>("get_work_item", { id: workItemId });
      expect(after.name).toBe(`${prefix}-wi-renamed`);
      expect(after.versionNumber).toBe(full.versionNumber + 1);

      const versions = await callTool<Array<{ versionNumber: number }>>("get_work_item_versions", { id: workItemId });
      expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);

      const history = await callTool<
        Array<{ workItemChangedFields: { name?: { oldValue: string; newValue: string } } }>
      >("get_work_item_history", { id: workItemId, take: 10 });
      expect(history.some((h) => h.workItemChangedFields.name?.newValue === `${prefix}-wi-renamed`)).toBe(true);
    });

    it("update_work_item reports missing required fields from the API", async () => {
      await expect(callTool("update_work_item", { payload: { id: workItemId, name: "x" } })).rejects.toThrow(
        /PUT \/api\/v2\/workItems failed \(400\): .*State/,
      );
    });

    it("upload_work_item_attachment attaches a file; invalid base64 is rejected locally", async () => {
      const attachmentId = await callTool<string>("upload_work_item_attachment", {
        id: workItemId,
        filename: "note.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("hello").toString("base64"),
      });
      const item = await callTool<WorkItem>("get_work_item", { id: workItemId });
      expect(item.attachments).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: attachmentId, name: "note.txt", size: 5 })]),
      );

      await expect(
        callTool("upload_work_item_attachment", {
          id: workItemId,
          filename: "bad.txt",
          contentType: "text/plain",
          contentBase64: "!!!not base64",
        }),
      ).rejects.toThrow("valid base64");
    });

    it("get_shared_step returns shared steps and refuses other work item types", async () => {
      sharedStepId = (
        await callTool<WorkItem>("create_work_item", {
          name: `${prefix}-ss`,
          entityTypeName: "SharedSteps",
          steps: [{ action: "login" }],
        })
      ).id;
      const step = await callTool<WorkItem>("get_shared_step", { id: sharedStepId });
      expect(step.entityTypeName).toBe("SharedSteps");
      await expect(callTool("get_shared_step", { id: workItemId })).rejects.toThrow("not a shared step");
    });
  });

  describe("test plans and runs", () => {
    const tag = `${prefix}-tag`;

    it("list_test_plan_tags sees a plan tag; update_test_plan replaces the plan", async () => {
      planId = (await callTool<{ id: string }>("create_test_plan", { name: `${prefix}-plan`, tags: [tag] })).id;
      const tags = await callTool<Array<{ name: string }>>("list_test_plan_tags", { take: 1000 });
      expect(tags.map((t) => t.name)).toContain(tag);

      await callTool("update_test_plan", {
        payload: { id: planId, projectId: getProjectId(), name: `${prefix}-plan-renamed`, description: "replaced" },
      });
      const plan = await callTool<{ name: string; description: string; tags: unknown[] }>("get_test_plan", {
        id: planId,
      });
      expect(plan.name).toBe(`${prefix}-plan-renamed`);
      expect(plan.description).toBe("replaced");
      expect(plan.tags).toEqual([]); // PUT is a full replacement
    });

    it("run from work items: results, statistics, stop; plan analytics", async () => {
      const suite = await callTool<{ id: string }>("create_test_suite", { testPlanId: planId, name: "Manual" });
      await callTool("set_test_suite_work_items", { id: suite.id, workItemIds: [workItemId] });
      // Plan runs from work items accept only automated work items.
      autoTestId = (
        await callTool<{ id: string }>("create_autotest", {
          externalId: `${prefix}-at`,
          name: `${prefix}-at`,
          workItemIds: [workItemId],
        })
      ).id;
      const defaultConfigurationId = await getDefaultConfigurationId();

      const run = await callTool<{ id: string; stateName: string }>("create_test_run_from_work_items", {
        testPlanId: planId,
        workItemIds: [workItemId],
        configurationIds: [defaultConfigurationId],
        name: `${prefix}-run`,
      });
      runId = run.id;
      await callTool("start_test_run", { id: runId });

      const results = await callTool<unknown[]>("get_test_run_results", { id: runId });
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);

      const stats = await callTool<Record<string, unknown>>("get_test_run_statistics", { id: runId });
      expect(stats).toEqual(expect.any(Object));
      expect(JSON.stringify(stats)).toMatch(/\d/);

      await callTool("stop_test_run", { id: runId });
      expect((await callTool<{ stateName: string }>("get_test_run", { id: runId })).stateName).toBe("Stopped");
      await expect(callTool("stop_test_run", { id: runId })).rejects.toThrow(/failed \(\d{3}\)/);

      const analytics = await callTool<Record<string, unknown[]>>("get_test_plan_analytics", { id: planId });
      expect(analytics).toHaveProperty("countGroupByStatus");
    });
  });

  describe("configurations", () => {
    it("update_configuration replaces name and description", async () => {
      configurationId = (await callTool<{ id: string }>("create_configuration", { name: `${prefix}-cfg` })).id;
      await callTool("update_configuration", {
        payload: {
          id: configurationId,
          projectId: getProjectId(),
          name: `${prefix}-cfg-renamed`,
          description: "replaced",
          parameters: {},
          isDefault: false,
        },
      });
      const cfg = await callTool<{ name: string; description: string; isDefault: boolean }>("get_configuration", {
        id: configurationId,
      });
      expect(cfg).toMatchObject({ name: `${prefix}-cfg-renamed`, description: "replaced", isDefault: false });
    });
  });

  describe("negative paths", () => {
    it.each([
      ["get_work_item", { id: `../projects/${MISSING_UUID}` }],
      ["get_work_item", { id: `%2e%2e/projects/${MISSING_UUID}` }],
      ["delete_work_item", { id: `../projects/${MISSING_UUID}` }],
      ["get_test_run", { id: "x?foo=1" }],
      ["start_test_run", { id: "" }],
    ])("%s with id %j is rejected before reaching the API", async (tool, args) => {
      await expect(callTool(tool, args)).rejects.toThrow(/Invalid request path|must be/);
    });

    it.each([
      ["get_work_item", "/api/v2/workItems/"],
      ["get_test_run", "/api/v2/testRuns/"],
      ["get_test_plan", "/api/v2/testPlans/"],
      ["get_configuration", "/api/v2/configurations/"],
      ["get_section", "/api/v2/sections/"],
    ])("%s with a missing id returns a readable 404", async (tool, path) => {
      await expect(callTool(tool, { id: MISSING_UUID })).rejects.toThrow(
        new RegExp(`GET ${path.replace(/\//g, "\\/")}${MISSING_UUID} failed \\(404\\)`),
      );
    });

    it("a malformed id gets a readable 4xx from the API", async () => {
      await expect(callTool("get_test_plan", { id: "not-a-uuid" })).rejects.toThrow(/failed \(4\d\d\)/);
    });

    it("projectName resolves to the same project as projectId; unknown names fail clearly", async () => {
      const project = await callTool<{ name: string }>("get_project", { id: getProjectId() });
      const byName = await callTool<Array<{ id: string }>>("list_sections", { projectName: project.name });
      const byId = await callTool<Array<{ id: string }>>("list_sections", { projectId: getProjectId() });
      expect(byName.map((s) => s.id).sort()).toEqual(byId.map((s) => s.id).sort());
      await expect(callTool("list_sections", { projectName: `${prefix}-no-such-project` })).rejects.toThrow();
    });

    it("page/size and skip/take paginate the same way", async () => {
      const all = await callTool<Array<{ id: string }>>("list_work_items", { take: 1000 });
      if (all.length < 2) return; // not enough data to compare pages
      const byPage = await callTool<Array<{ id: string }>>("list_work_items", { page: 2, size: 1 });
      const bySkip = await callTool<Array<{ id: string }>>("list_work_items", { skip: 1, take: 1 });
      expect(byPage.map((w) => w.id)).toEqual(bySkip.map((w) => w.id));
      expect(byPage).toHaveLength(1);
    });
  });
});
