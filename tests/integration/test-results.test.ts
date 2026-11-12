import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callTool, getClient, getProjectId, integrationEnabled, removeTestRun, uniqueName } from "./setup.js";

interface TestResult {
  id: string;
  outcome: string;
  comment: string | null;
  status: { code: string };
}

describe.skipIf(!integrationEnabled)("integration: test results", () => {
  const externalId = uniqueName("autotest");
  let autoTestId: string | undefined;
  let runId: string | undefined;
  let configurationId: string;

  beforeAll(async () => {
    // Fixture: an autotest is required to submit results into a run (no autotest tools yet).
    const autoTest = await getClient().post<{ id: string }>("/api/v2/autoTests", {
      externalId,
      projectId: getProjectId(),
      name: externalId,
    });
    autoTestId = autoTest.id;
    const configurations = await callTool<Array<{ id: string }>>("list_configurations", {});
    configurationId = configurations[0].id;
    runId = (await callTool<{ id: string }>("create_test_run", { name: uniqueName("results") })).id;
  });

  afterAll(async () => {
    await removeTestRun(runId);
    if (autoTestId) {
      await getClient().delete(`/api/v2/autoTests/${autoTestId}`).catch(() => undefined);
    }
  });

  it("submit -> set (partial) -> update (full replace) -> search", async () => {
    const [resultId] = await callTool<string[]>("submit_test_run_results", {
      id: runId,
      results: [{ autoTestExternalId: externalId, configurationId, statusCode: "Failed", message: "boom" }],
    });
    expect((await callTool<TestResult>("get_test_result", { id: resultId })).status.code).toBe("FAILED");

    await callTool("set_test_result", { id: resultId, statusCode: "Blocked", comment: "waiting for fix" });
    let result = await callTool<TestResult>("get_test_result", { id: resultId });
    expect(result.status.code).toBe("BLOCKED");
    expect(result.comment).toBe("waiting for fix");

    await callTool("set_test_result", { id: resultId, statusCode: "Passed" });
    result = await callTool<TestResult>("get_test_result", { id: resultId });
    expect(result.status.code).toBe("PASSED");
    expect(result.comment).toBe("waiting for fix"); // partial change keeps other fields

    await callTool("update_test_result", { id: resultId, outcome: "Failed" });
    result = await callTool<TestResult>("get_test_result", { id: resultId });
    expect(result.outcome).toBe("Failed");
    expect(result.comment).toBeNull(); // PUT is a full replacement

    const found = await callTool<Array<{ id: string }>>("search_test_results", { testRunIds: [runId] });
    expect(found.map((r) => r.id)).toEqual([resultId]);
  });
});
