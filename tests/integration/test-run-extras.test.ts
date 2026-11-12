import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getDefaultConfigurationId, integrationEnabled, removeTestRun, uniqueName } from "./setup.js";

interface Run {
  id: string;
  name: string;
  description: string | null;
  stateName: string;
  testPlanId: string | null;
  tags: string[];
  testResults: Array<{ id: string; autoTestId: string }>;
}

describe.skipIf(!integrationEnabled)("integration: autotest runs, search, patch, attachments", () => {
  const prefix = uniqueName("byat");
  const externalId = `${prefix}-ext`;
  let autoTestId: string | undefined;
  let run: Run | undefined;

  beforeAll(async () => {
    autoTestId = (await callTool<{ id: string }>("create_autotest", { externalId, name: prefix })).id;
  });

  afterAll(async () => {
    await removeTestRun(run?.id);
    await callSafe("delete_autotest", { id: autoTestId });
  });

  it("create_test_run_from_autotests pre-creates one result per autotest", async () => {
    run = await callTool<Run>("create_test_run_from_autotests", {
      autoTestExternalIds: [externalId],
      configurationIds: [await getDefaultConfigurationId()],
      name: prefix,
      tags: ["mcp-it"],
    });
    expect(run).toMatchObject({ stateName: "NotStarted", testPlanId: null, tags: ["mcp-it"] });
    expect(run.testResults.map((r) => r.autoTestId)).toEqual([autoTestId]);
  });

  it("search_test_runs finds it by name; set_test_run patches name/description/tags", async () => {
    const found = await callTool<Array<{ id: string }>>("search_test_runs", { name: prefix });
    expect(found.map((r) => r.id)).toEqual([run!.id]);

    await callTool("set_test_run", { id: run!.id, name: `${prefix}-v2`, description: "desc", tags: ["b"] });
    const current = await callTool<Run>("get_test_run", { id: run!.id });
    expect(current).toMatchObject({ name: `${prefix}-v2`, description: "desc", tags: ["b"] });
  });

  it("test result attachments: upload -> list -> download -> delete", async () => {
    const resultId = run!.testResults[0].id;
    const { id: attachmentId } = await callTool<{ id: string }>("upload_test_result_attachment", {
      id: resultId,
      filename: "log.txt",
      contentType: "text/plain",
      contentBase64: Buffer.from("hello").toString("base64"),
    });
    expect(typeof attachmentId).toBe("string");

    const list = await callTool<Array<{ id: string; name: string; type: string }>>("list_test_result_attachments", {
      id: resultId,
    });
    expect(list).toEqual([expect.objectContaining({ id: attachmentId, name: "log.txt", type: "text/plain" })]);

    const file = await callTool<{ content: string }>("get_test_result_attachment", { id: resultId, attachmentId });
    expect(Buffer.from(file.content, "base64").toString()).toBe("hello");

    await callTool("delete_test_result_attachment", { id: resultId, attachmentId });
    expect(await callTool("list_test_result_attachments", { id: resultId })).toEqual([]);
  });
});
