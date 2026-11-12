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

  it("search_projects pages with page/size as offsets (page 2 != page 1)", async () => {
    const all = await callTool<Project[]>("search_projects", { query: {}, orderBy: "name" });
    const page1 = await callTool<Project[]>("search_projects", { query: {}, orderBy: "name", page: 1, size: 1 });
    const page2 = await callTool<Project[]>("search_projects", { query: {}, orderBy: "name", page: 2, size: 1 });
    expect(page1.map((p) => p.id)).toEqual(all.slice(0, 1).map((p) => p.id));
    expect(page2.map((p) => p.id)).toEqual(all.slice(1, 2).map((p) => p.id));
  });
});
