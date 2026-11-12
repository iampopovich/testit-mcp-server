import { describe, expect, it } from "vitest";
import { callTool, getProjectId, integrationEnabled } from "./setup.js";

interface Project {
  id: string;
  name: string;
}

describe.skipIf(!integrationEnabled)("integration: projects", () => {
  it("get_project returns the configured project", async () => {
    const project = await callTool<Project>("get_project", { id: getProjectId() });
    expect(project.id).toBe(getProjectId());
  });

  it("search_projects finds the configured project by name", async () => {
    const project = await callTool<Project>("get_project", { id: getProjectId() });
    const found = await callTool<Project[]>("search_projects", { query: { name: project.name } });
    expect(found.map((p) => p.id)).toContain(getProjectId());
  });
});
