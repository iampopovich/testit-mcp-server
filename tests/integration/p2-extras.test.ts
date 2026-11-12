import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callSafe,
  callTool,
  getDefaultConfigurationId,
  integrationEnabled,
  removeTestRun,
  removeWorkItem,
  uniqueName,
} from "./setup.js";

describe.skipIf(!integrationEnabled)("integration: autotest history/flaky, configuration parameters, attachments", () => {
  const prefix = uniqueName("p2");
  const externalId = `${prefix}-ext`;
  let autoTestId: string | undefined;
  let runId: string | undefined;
  let parameterId: string | undefined;
  let workItemId: string | undefined;

  beforeAll(async () => {
    autoTestId = (await callTool<{ id: string }>("create_autotest", { externalId, name: prefix })).id;
  });

  afterAll(async () => {
    await removeTestRun(runId);
    await callSafe("delete_autotest", { id: autoTestId });
    await callSafe("delete_configuration_parameter", { id: parameterId });
    await removeWorkItem(workItemId);
  });

  it("results history, test runs, flaky flag", async () => {
    const configurationId = await getDefaultConfigurationId();
    runId = (
      await callTool<{ id: string }>("create_test_run_from_autotests", {
        autoTestExternalIds: [externalId],
        configurationIds: [configurationId],
        name: prefix,
      })
    ).id;
    await callTool("submit_test_run_results", {
      id: runId,
      results: [{ autoTestExternalId: externalId, configurationId, statusCode: "Failed", message: "boom" }],
    });

    const history = await callTool<Array<{ testRunId: string; status: { code: string } }>>(
      "get_autotest_results_history",
      { id: autoTestId },
    );
    expect(history.map((h) => [h.testRunId, h.status.code])).toEqual([[runId, "FAILED"]]);
    expect(await callTool("get_autotest_results_history", { id: autoTestId, statusCodes: ["PASSED"] })).toEqual([]);

    const runs = await callTool<Array<{ id: string }>>("list_autotest_test_runs", { id: autoTestId });
    expect(runs.map((r) => r.id)).toEqual([runId]);
    expect(await callTool("get_autotest_average_duration", { id: autoTestId })).toHaveProperty("failedAverageDuration");

    await callTool("set_autotests_flaky", { autoTestIds: [autoTestId], value: true });
    expect((await callTool<{ isFlaky: boolean }>("get_autotest", { id: autoTestId })).isFlaky).toBe(true);
    await callTool("set_autotests_flaky", { autoTestIds: [autoTestId], value: false });
    expect((await callTool<{ isFlaky: boolean }>("get_autotest", { id: autoTestId })).isFlaky).toBe(false);
  });

  it("configuration parameters: create -> search -> update (replaces values) -> delete", async () => {
    const created = await callTool<{ id: string; values: Array<{ value: string }> }>("create_configuration_parameter", {
      name: prefix,
      values: ["firefox", "chrome"],
    });
    parameterId = created.id;
    expect(created.values.map((v) => v.value)).toEqual(["firefox", "chrome"]);

    const found = await callTool<Array<{ id: string; values: Array<{ value: string }> }>>(
      "search_configuration_parameters",
      { name: prefix },
    );
    expect(found.map((p) => p.id)).toEqual([created.id]);
    expect(found[0].values.map((v) => v.value).sort()).toEqual(["chrome", "firefox"]);

    await callTool("update_configuration_parameter", { id: created.id, name: prefix, values: ["safari"] });
    const updated = await callTool<{ values: Array<{ value: string }> }>("get_configuration_parameter", { id: created.id });
    expect(updated.values.map((v) => v.value)).toEqual(["safari"]);

    await callTool("delete_configuration_parameter", { id: created.id });
    await expect(callTool("get_configuration_parameter", { id: created.id })).rejects.toThrow("(404)");
    parameterId = undefined;
  });

  it("attachments: upload -> metadata/download -> link to work item; unlinked delete works", async () => {
    const content = Buffer.from("hello").toString("base64");
    const linked = await callTool<{ id: string; name: string }>("upload_attachment", {
      filename: "note.txt",
      contentType: "text/plain",
      contentBase64: content,
    });
    expect((await callTool<{ name: string }>("get_attachment_metadata", { id: linked.id })).name).toBe("note.txt");
    const file = await callTool<{ content: string }>("get_attachment", { id: linked.id });
    expect(Buffer.from(file.content, "base64").toString()).toBe("hello");

    const wi = await callTool<{ id: string; attachments: Array<{ id: string }> }>("create_work_item", {
      name: `${prefix}-case`,
      attachmentIds: [linked.id],
    });
    workItemId = wi.id;
    expect(wi.attachments.map((a) => a.id)).toEqual([linked.id]);

    const loose = await callTool<{ id: string }>("upload_attachment", {
      filename: "tmp.txt",
      contentType: "text/plain",
      contentBase64: content,
    });
    await callTool("delete_attachment", { id: loose.id });
    await expect(callTool("get_attachment_metadata", { id: loose.id })).rejects.toThrow("(404)");
  });
});
