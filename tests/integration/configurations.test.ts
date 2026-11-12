import { afterAll, describe, expect, it } from "vitest";
import { callSafe, callTool, getProjectId, integrationEnabled, uniqueName } from "./setup.js";

interface Configuration {
  id: string;
  name: string;
  parameters: Record<string, string>;
  isDefault: boolean;
}

describe.skipIf(!integrationEnabled)("integration: configurations and dictionaries", () => {
  const prefix = uniqueName("cfg");
  let configId: string | undefined;

  afterAll(async () => {
    await callSafe("delete_configuration", { id: configId });
    await callSafe("purge_configuration", { id: configId });
  });

  it("create -> set -> delete -> restore -> delete -> purge", async () => {
    const cfg = await callTool<Configuration>("create_configuration", {
      name: prefix,
      parameters: { browser: "firefox" },
    });
    configId = cfg.id;
    expect(cfg).toMatchObject({ parameters: { browser: "firefox" }, isDefault: false });

    await callTool("set_configuration", { id: cfg.id, name: `${prefix}-renamed` });
    const renamed = await callTool<Configuration>("get_configuration", { id: cfg.id });
    expect(renamed).toMatchObject({ name: `${prefix}-renamed`, parameters: { browser: "firefox" } });

    await callTool("delete_configuration", { id: cfg.id });
    await expect(callTool("get_configuration", { id: cfg.id })).rejects.toThrow("(404)");
    await callTool("restore_configuration", { id: cfg.id });
    expect((await callTool<Configuration>("get_configuration", { id: cfg.id })).name).toBe(`${prefix}-renamed`);

    await callTool("delete_configuration", { id: cfg.id });
    await callTool("purge_configuration", { id: cfg.id });
    configId = undefined;
    const left = await callTool<Configuration[]>("list_configurations", {});
    expect(left.map((c) => c.id)).not.toContain(cfg.id);
  });

  it("list_test_statuses returns system codes usable as statusCode", async () => {
    const statuses = await callTool<Array<{ code: string; type: string }>>("list_test_statuses", {});
    expect(statuses.map((s) => s.code)).toEqual(expect.arrayContaining(["PASSED", "FAILED", "SKIPPED", "BLOCKED"]));
  });

  it("list_tags and list_project_attributes return arrays", async () => {
    expect(Array.isArray(await callTool("list_tags", { take: 5 }))).toBe(true);
    expect(Array.isArray(await callTool("list_tags", { projectId: getProjectId() }))).toBe(true);
    expect(Array.isArray(await callTool("list_project_attributes", {}))).toBe(true);
  });
});
