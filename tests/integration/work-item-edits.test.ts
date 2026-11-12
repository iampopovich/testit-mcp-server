import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callSafe, callTool, integrationEnabled, removeWorkItem, uniqueName } from "./setup.js";

interface WorkItem {
  id: string;
  name: string;
  state: string;
  priority: string;
  description: string | null;
  sectionId: string;
  versionNumber: number;
  tags: Array<{ name: string }>;
  steps: unknown[];
}

describe.skipIf(!integrationEnabled)("integration: work item edits, move, comments", () => {
  const prefix = uniqueName("wi-edit");
  let item: WorkItem;
  let sectionId: string | undefined;

  beforeAll(async () => {
    item = await callTool<WorkItem>("create_work_item", {
      name: prefix,
      tags: ["a"],
      steps: [{ action: "open", expected: "opened" }],
    });
    sectionId = (await callTool<{ id: string }>("create_section", { name: `${prefix}-section` })).id;
  });

  afterAll(async () => {
    await removeWorkItem(item?.id);
    await callSafe("delete_section", { id: sectionId });
  });

  it("set_work_item changes only given fields and bumps the version", async () => {
    await callTool("set_work_item", { id: item.id, name: `${prefix}-v2`, state: "Ready", priority: "High" });
    let current = await callTool<WorkItem>("get_work_item", { id: item.id });
    expect(current).toMatchObject({ name: `${prefix}-v2`, state: "Ready", priority: "High" });
    expect(current.versionNumber).toBe(item.versionNumber + 1);
    expect(current.tags.map((t) => t.name)).toEqual(["a"]);
    expect(current.steps).toHaveLength(1);

    await callTool("set_work_item", { id: item.id, tags: ["b"], description: "desc" });
    current = await callTool<WorkItem>("get_work_item", { id: item.id });
    expect(current.tags.map((t) => t.name)).toEqual(["b"]);
    expect(current.description).toBe("desc");
  });

  it("move_work_item moves between sections", async () => {
    await callTool("move_work_item", { id: item.id, sectionId });
    expect((await callTool<WorkItem>("get_work_item", { id: item.id })).sectionId).toBe(sectionId);
    await callTool("move_work_item", { id: item.id, sectionId: item.sectionId });
    expect((await callTool<WorkItem>("get_work_item", { id: item.id })).sectionId).toBe(item.sectionId);
  });

  it("comments: create -> update -> list -> delete", async () => {
    const comment = await callTool<{ id: string; text: string }>("create_work_item_comment", {
      workItemId: item.id,
      text: "first",
    });
    expect(comment.text).toBe("first");
    await callTool("update_work_item_comment", { commentId: comment.id, text: "edited" });
    const comments = await callTool<Array<{ id: string; text: string }>>("list_work_item_comments", { id: item.id });
    expect(comments).toEqual([expect.objectContaining({ id: comment.id, text: "edited" })]);
    await callTool("delete_work_item_comment", { commentId: comment.id });
    expect(await callTool("list_work_item_comments", { id: item.id })).toEqual([]);
  });

  it("get_work_item_test_results_history is empty for a fresh case", async () => {
    expect(await callTool("get_work_item_test_results_history", { id: item.id })).toEqual([]);
  });
});
