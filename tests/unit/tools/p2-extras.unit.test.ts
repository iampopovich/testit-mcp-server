import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never);
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("autotest extras", () => {
  it("results history posts a compact filter with paging", async () => {
    const { client, call } = setup();
    await call("get_autotest_results_history", { id: "a1", statusCodes: ["FAILED"], take: 5 });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/autoTests/a1/testResults/search",
      body: { statusCodes: ["FAILED"] },
    });
    expect(definedQuery(client.calls[0].query)).toEqual({ Take: 5 });
  });

  it("set_autotests_flaky selects by explicit ids and rejects empty lists", async () => {
    const { client, call } = setup();
    await call("set_autotests_flaky", { autoTestIds: ["a1"], value: true });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/autoTests/flaky/bulk",
      body: { autoTestSelect: { extractionModel: { ids: { include: ["a1"] } } }, value: true },
    });
    await expect(call("set_autotests_flaky", { autoTestIds: [], value: true })).rejects.toThrow("non-empty");
    await expect(call("set_autotests_flaky", { autoTestIds: ["a1"] })).rejects.toThrow('"value" must be a boolean');
  });
});

describe("configuration parameter tools", () => {
  it("search unwraps envelopes and filters by name", async () => {
    const { client, call } = setup();
    client.responses.set("POST /api/v2/configuration-parameters/search", {
      data: [
        { id: "1", name: "browser", values: { data: [{ value: "firefox" }] }, projects: { data: [{ id: "p1" }] } },
        { id: "2", name: "os", values: { data: [] }, projects: { data: [] } },
      ],
      totalCount: 2,
    });
    const result = await call("search_configuration_parameters", { projectId: "p1", name: "BROW" });
    expect(client.calls[0].body).toEqual({ projectIds: ["p1"] });
    expect(result).toEqual([
      { id: "1", name: "browser", values: [{ value: "firefox" }], projects: [{ id: "p1" }] },
    ]);
  });

  it("create/update build {name, values, projects}", async () => {
    const { client, call } = setup();
    await call("create_configuration_parameter", { projectId: "p1", name: "browser", values: ["firefox"] });
    await call("update_configuration_parameter", { id: "c1", projectIds: ["p2"], name: "b", values: ["x"] });
    expect(client.calls[0]).toMatchObject({
      method: "POST",
      path: "/api/v2/configuration-parameters",
      body: { name: "browser", values: [{ value: "firefox" }], projects: [{ id: "p1" }] },
    });
    expect(client.calls[1]).toMatchObject({
      method: "PUT",
      path: "/api/v2/configuration-parameters/c1",
      body: { name: "b", values: [{ value: "x" }], projects: [{ id: "p2" }] },
    });
    await expect(call("create_configuration_parameter", { projectId: "p1", name: "x", values: [] })).rejects.toThrow(
      '"values" must be a non-empty',
    );
  });
});

describe("attachment tools", () => {
  it("upload posts multipart to /attachments; create_work_item maps attachmentIds", async () => {
    const { client, call } = setup();
    await call("upload_attachment", { filename: "a.txt", contentType: "text/plain", contentBase64: "aGk=" });
    expect(client.postMultipart.mock.calls[0][0]).toBe("/api/v2/attachments");
    await call("create_work_item", { projectId: "p1", name: "c", attachmentIds: ["att1"] });
    expect(client.calls.at(-1)!.body).toMatchObject({ attachments: [{ id: "att1" }] });
  });
});
