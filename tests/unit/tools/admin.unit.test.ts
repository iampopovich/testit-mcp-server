import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never, { toolsets: ["admin"] });
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("admin tools: webhooks, workflows, notifications, settings", () => {
  it("create_webhook fills explicit defaults; customBody switches shouldSendCustomBody", async () => {
    const { client, call } = setup();
    await call("create_webhook", { projectId: "p1", name: "h", eventType: "TestRunStopped", url: "https://x" });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/webhooks",
      body: {
        projectId: "p1",
        name: "h",
        eventType: "TestRunStopped",
        url: "https://x",
        requestType: "Post",
        isEnabled: true,
        shouldSendBody: true,
        shouldSendCustomBody: false,
        headers: {},
        queryParameters: {},
      },
    });
    await call("create_webhook", { projectId: "p1", name: "h", eventType: "TestRunStopped", url: "u", customBody: "{}" });
    expect(client.calls[1].body).toMatchObject({ customBody: "{}", shouldSendCustomBody: true });
  });

  it("set_webhook merges changes over the current webhook (full PUT)", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/webhooks/w1", {
      id: "w1",
      projectId: "p1",
      name: "h",
      eventType: "TestRunStopped",
      url: "https://x",
      requestType: "Put",
      isEnabled: true,
      headers: { a: "b" },
      queryParameters: {},
      shouldSendBody: false,
      shouldSendCustomBody: false,
      shouldReplaceParameters: true,
      shouldEscapeParameters: true,
      createdDate: "ignored",
    });
    await call("set_webhook", { id: "w1", isEnabled: false });
    expect(client.calls[1]).toMatchObject({ method: "PUT", path: "/api/v2/webhooks/w1" });
    expect(client.calls[1].body).toEqual({
      projectId: "p1",
      name: "h",
      eventType: "TestRunStopped",
      url: "https://x",
      requestType: "Put",
      isEnabled: false,
      headers: { a: "b" },
      queryParameters: {},
      shouldSendBody: false,
      shouldSendCustomBody: false,
      shouldReplaceParameters: true,
      shouldEscapeParameters: true,
    });
    await expect(call("set_webhook", { id: "w1" })).rejects.toThrow("Nothing to update");
  });

  it("workflows unwrap envelopes; notifications read one or all", async () => {
    const { client, call } = setup();
    client.responses.set("POST /api/v2/workflows/search", { data: [{ id: "wf" }], totalCount: 1 });
    expect(await call("list_workflows", {})).toEqual([{ id: "wf" }]);
    await call("set_notifications_read", { id: "n1" });
    await call("set_notifications_read", {});
    expect(client.calls.slice(1).map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v2/notifications/n1/read",
      "POST /api/v2/notifications/read",
    ]);
  });

  it("set_project_autotest_settings merges into the current settings without projectId", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/projects/p1/settings/autotests", {
      projectId: "p1",
      rerunEnabled: false,
      rerunAttemptsCount: 1,
      testRunsRetentionPeriodDays: 180,
    });
    await call("set_project_autotest_settings", { projectId: "p1", testRunsRetentionPeriodDays: 90 });
    expect(client.calls[1]).toMatchObject({
      method: "POST",
      path: "/api/v2/projects/p1/settings/autotests",
      body: { rerunEnabled: false, rerunAttemptsCount: 1, testRunsRetentionPeriodDays: 90 },
    });
    expect(client.calls[1].body).not.toHaveProperty("projectId");
    await expect(call("set_project_autotest_settings", { projectId: "p1" })).rejects.toThrow("Nothing to update");
  });
});
