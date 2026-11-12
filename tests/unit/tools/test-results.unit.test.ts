import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("test result tools", () => {
  it("set_test_result turns typed fields into JSON Patch replace ops", async () => {
    const { client, call } = setup();
    await call("set_test_result", {
      id: "tr1",
      statusCode: "FAILED",
      comment: "flaky",
      operations: [{ op: "add", path: "/links/-", value: { url: "https://bug" } }],
    });
    expect(client.calls[0]).toMatchObject({ method: "PATCH", path: "/api/v2/testResults/tr1" });
    expect(client.calls[0].body).toEqual([
      { op: "replace", path: "/statusCode", value: "FAILED" },
      { op: "replace", path: "/comment", value: "flaky" },
      { op: "add", path: "/links/-", value: { url: "https://bug" } },
    ]);
  });

  it("set_test_result refuses an empty change", async () => {
    const { call } = setup();
    await expect(call("set_test_result", { id: "tr1" })).rejects.toThrow("Nothing to change");
  });

  it("update_test_result sends a PUT with typed fields over raw payload", async () => {
    const { client, call } = setup();
    await call("update_test_result", { id: "tr1", outcome: "Passed", payload: { comment: "a", outcome: "Failed" } });
    expect(client.calls[0]).toMatchObject({ method: "PUT", path: "/api/v2/testResults/tr1" });
    expect(client.calls[0].body).toEqual({ comment: "a", outcome: "Passed" });
  });

  it("search_test_results merges typed filter fields into the body", async () => {
    const { client, call } = setup();
    await call("search_test_results", { testRunIds: ["r1"], outcomes: ["Failed"], query: { namespace: "ns" }, take: 2 });
    expect(client.calls[0].path).toBe("/api/v2/testResults/search");
    expect(client.calls[0].body).toEqual({ namespace: "ns", testRunIds: ["r1"], outcomes: ["Failed"] });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 2 });
  });

  it("submit_test_run_results posts the results array to the run", async () => {
    const { client, call } = setup();
    const results = [{ autoTestExternalId: "a", configurationId: "c", statusCode: "Passed" }];
    await call("submit_test_run_results", { id: "r1", results });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testRuns/r1/testResults", body: results });
    await expect(call("submit_test_run_results", { id: "r1", results: [] })).rejects.toThrow("non-empty array");
  });
});
