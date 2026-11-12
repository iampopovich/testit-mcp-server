import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("test run tools", () => {
  it("create_test_run builds a CreateEmptyTestRunApiModel body", async () => {
    const { client, call } = setup();
    await call("create_test_run", {
      projectId: "p1",
      name: "Nightly",
      tags: ["ci"],
      launchSource: "jenkins#42",
      payload: { links: [{ url: "https://ci" }] },
    });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testRuns" });
    expect(client.calls[0].body).toEqual({
      projectId: "p1",
      name: "Nightly",
      tags: ["ci"],
      launchSource: "jenkins#42",
      links: [{ url: "https://ci" }],
    });
  });

  it("create_test_run keeps projectId from legacy payload", async () => {
    const { client, call } = setup();
    await call("create_test_run", { payload: { projectId: "legacy", name: "x" } });
    expect(client.calls[0].body).toEqual({ projectId: "legacy", name: "x" });
  });

  it("list_test_runs forwards state filters and paging", async () => {
    const { client, call } = setup();
    await call("list_test_runs", { projectId: "p1", inProgress: true, testPlanId: "tp", take: 10 });
    expect(client.calls[0].path).toBe("/api/v2/projects/p1/testRuns");
    expect(definedQuery(client.calls[0].query)).toEqual({ inProgress: true, testPlanId: "tp", Take: 10 });
  });

  it("complete_test_run posts to /complete", async () => {
    const { client, call } = setup();
    await call("complete_test_run", { id: "r1" });
    expect(client.calls[0]).toMatchObject({ method: "POST", path: "/api/v2/testRuns/r1/complete" });
  });
});

describe("test run search, patch and autotest runs", () => {
  it("search_test_runs scopes to the project and merges typed fields", async () => {
    const { client, call } = setup();
    await call("search_test_runs", { projectId: "p1", states: ["Completed"], name: "nightly", take: 5 });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/search",
      body: { projectIds: ["p1"], name: "nightly", states: ["Completed"] },
    });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 5 });
  });

  it("set_test_run sends replace ops and rejects empty updates", async () => {
    const { client, call } = setup();
    await call("set_test_run", { id: "r1", tags: ["smoke"] });
    expect(client.calls[0]).toMatchObject({
      method: "PATCH",
      path: "/api/v2/testRuns/r1",
      body: [{ op: "replace", path: "/tags", value: ["smoke"] }],
    });
    await expect(call("set_test_run", { id: "r1" })).rejects.toThrow("Nothing to update");
  });

  it("create_test_run_from_autotests builds the byAutoTests body", async () => {
    const { client, call } = setup();
    await call("create_test_run_from_autotests", {
      projectId: "p1",
      autoTestExternalIds: ["e1"],
      configurationIds: ["c1"],
      name: "CI",
    });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/testRuns/byAutoTests",
      body: { projectId: "p1", autoTestExternalIds: ["e1"], configurationIds: ["c1"], name: "CI" },
    });
    await expect(
      call("create_test_run_from_autotests", { projectId: "p1", autoTestExternalIds: ["e1"], configurationIds: [] }),
    ).rejects.toThrow('"configurationIds" must be a non-empty array');
  });
});
