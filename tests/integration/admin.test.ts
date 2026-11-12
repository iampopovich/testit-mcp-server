import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getProjectId, integrationEnabled, uniqueName } from "./setup.js";

interface Webhook {
  id: string;
  name: string;
  isEnabled: boolean;
  url: string;
  shouldSendBody: boolean;
}

describe.skipIf(!integrationEnabled)("integration: admin webhooks, workflows, notifications, settings", () => {
  const prefix = uniqueName("hook");
  let webhookId: string | undefined;

  afterAll(async () => {
    await callSafe("delete_webhook", { id: webhookId });
  });

  it("webhook lifecycle with variables, URL test and logs", async () => {
    const hook = await callTool<Webhook>("create_webhook", {
      name: prefix,
      eventType: "TestPlansStatusChanged",
      url: "https://example.com/testit-hook",
    });
    webhookId = hook.id;
    expect(hook).toMatchObject({ isEnabled: true, shouldSendBody: true });

    const found = await callTool<Webhook[]>("search_webhooks", { name: prefix });
    expect(found.map((h) => h.id)).toEqual([hook.id]);

    await callTool("set_webhook", { id: hook.id, isEnabled: false });
    expect(await callTool("get_webhook", { id: hook.id })).toMatchObject({
      name: prefix,
      isEnabled: false,
      url: "https://example.com/testit-hook",
      shouldSendBody: true,
    });

    const vars = await callTool<string[]>("list_webhook_variables", { eventType: "TestPlansStatusChanged" });
    expect(vars).toContain("$TEST_PLAN_NAME");
    const response = await callTool<{ uri: string; statusCode: number }>("submit_webhook_test", {
      url: "https://example.com/",
    });
    expect(response.uri).toBe("https://example.com/");
    expect(typeof response.statusCode).toBe("number");
    expect(Array.isArray(await callTool("list_webhook_logs", { take: 5 }))).toBe(true);

    await callTool("delete_webhook", { id: hook.id });
    await expect(callTool("get_webhook", { id: hook.id })).rejects.toThrow("(404)");
    webhookId = undefined;
  });

  it("workflows: the project's workflow and its statuses", async () => {
    const workflows = await callTool<Array<{ id: string }>>("list_workflows", {});
    expect(workflows.length).toBeGreaterThan(0);
    const workflow = await callTool<{ statuses: Array<{ code: string }> }>("get_workflow", { id: workflows[0].id });
    expect(workflow.statuses.map((s) => s.code)).toContain("PASSED");
    const projects = await callTool<Array<{ id: string }>>("list_workflow_projects", { id: workflows[0].id });
    expect(projects.map((p) => p.id)).toContain(getProjectId());
  });

  it("notifications: search, count, mark an already-read one as read", async () => {
    expect(typeof (await callTool("get_notifications_count", {}))).toBe("number");
    const read = await callTool<Array<{ id: string }>>("search_notifications", { isRead: true, take: 1 });
    if (read.length > 0) {
      await callTool("set_notifications_read", { id: read[0].id });
    }
    expect(Array.isArray(await callTool("search_notifications", { take: 1 }))).toBe(true);
  });

  it("project autotest settings: change one field, others kept, then restore", async () => {
    type Settings = Record<string, unknown> & { testRunsRetentionPeriodDays: number };
    const before = await callTool<Settings>("get_project_autotest_settings", {});
    const changed = before.testRunsRetentionPeriodDays === 90 ? 91 : 90;
    try {
      await callTool("set_project_autotest_settings", { testRunsRetentionPeriodDays: changed });
      expect(await callTool("get_project_autotest_settings", {})).toEqual({
        ...before,
        testRunsRetentionPeriodDays: changed,
      });
    } finally {
      await callTool("set_project_autotest_settings", {
        testRunsRetentionPeriodDays: before.testRunsRetentionPeriodDays,
      });
    }
    expect(await callTool("get_project_autotest_settings", {})).toEqual(before);
  });
});
