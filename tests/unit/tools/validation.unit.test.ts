import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../../src/server-bootstrap.js";
import { getRequiredBase64 } from "../../../src/tools/utils.js";
import { createRecordingClient } from "../tool-test-helpers.js";

function setup() {
  const client = createRecordingClient();
  const { handlers } = buildToolRegistry(client as never, { toolsets: ["all"] });
  const call = (name: string, args: Record<string, unknown>) => handlers.get(name)!(args);
  return { client, call };
}

describe("full-replacement tools require a payload object", () => {
  it.each(["create_project", "update_project", "update_work_item", "update_test_plan", "update_configuration"])(
    "%s rejects a missing or non-object payload without calling the API",
    async (tool) => {
      const { client, call } = setup();
      await expect(call(tool, {})).rejects.toThrow('"payload" must be an object.');
      await expect(call(tool, { payload: [] })).rejects.toThrow('"payload" must be an object.');
      await expect(call(tool, { payload: "x" })).rejects.toThrow('"payload" must be an object.');
      expect(client.calls).toHaveLength(0);
    },
  );

  it("update_work_item sends the payload as is", async () => {
    const { client, call } = setup();
    await call("update_work_item", { payload: { id: "w1", name: "n" } });
    expect(client.calls).toEqual([
      { method: "PUT", path: "/api/v2/workItems", body: { id: "w1", name: "n" }, query: undefined },
    ]);
  });
});

describe("base64 uploads", () => {
  it("getRequiredBase64 accepts standard, URL-safe, unpadded and wrapped input", () => {
    expect(getRequiredBase64({ c: "aGVsbG8=" }, "c")).toBe("aGVsbG8=");
    expect(getRequiredBase64({ c: "aGVs\nbG8=" }, "c")).toBe("aGVsbG8=");
    expect(getRequiredBase64({ c: "aGVsbG8" }, "c")).toBe("aGVsbG8");
    expect(getRequiredBase64({ c: "-_-_" }, "c")).toBe("-_-_");
  });

  it.each(["!!!not base64", "aGVsbG8=x", "a", "a===", "data:text/plain;base64,aGVsbG8="])(
    "getRequiredBase64 rejects %j",
    (value) => {
      expect(() => getRequiredBase64({ c: value }, "c")).toThrow('"c" must be valid base64.');
    },
  );

  it.each([
    ["upload_attachment", { filename: "a.txt", contentType: "text/plain" }],
    ["upload_work_item_attachment", { id: "w1", filename: "a.txt", contentType: "text/plain" }],
    ["upload_test_result_attachment", { id: "r1", filename: "a.txt", contentType: "text/plain" }],
  ])("%s rejects invalid base64 before uploading", async (tool, args) => {
    const { client, call } = setup();
    await expect(call(tool, { ...args, contentBase64: "!!!not base64" })).rejects.toThrow("valid base64");
    expect(client.postMultipart).not.toHaveBeenCalled();
    expect(client.calls).toHaveLength(0);
  });
});

describe("get_shared_step", () => {
  it("returns a shared step", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/workItems/s1", { id: "s1", entityTypeName: "SharedSteps" });
    await expect(call("get_shared_step", { id: "s1" })).resolves.toEqual({ id: "s1", entityTypeName: "SharedSteps" });
  });

  it("refuses a work item that is not a shared step", async () => {
    const { client, call } = setup();
    client.responses.set("GET /api/v2/workItems/w1", { id: "w1", entityTypeName: "TestCases" });
    await expect(call("get_shared_step", { id: "w1" })).rejects.toThrow(
      "Work item w1 is a TestCases item, not a shared step. Use get_work_item for it.",
    );
  });
});
