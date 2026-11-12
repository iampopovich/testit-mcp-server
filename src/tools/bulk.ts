import type { TestITApiClient } from "../client.js";
import * as api from "../api/bulk.js";
import type { ToolBundle } from "./types.js";
import {
  asObject,
  getOptionalString,
  getOptionalStringArray,
  resolveProjectId,
  type ToolArgs,
} from "./utils.js";

const TAG_ACTIONS = ["Add", "Replace", "ToRemove", "ClearAll"] as const;

const PROJECT = {
  projectId: { type: "string", description: "Project UUID (defaults to TESTIT_PROJECT_ID)." },
  projectName: { type: "string" },
} as const;

const idsSchema = (what: string) => ({
  type: "object" as const,
  properties: {
    ...PROJECT,
    ids: { type: "array", items: { type: "string" }, description: `${what} UUIDs (non-empty).` },
  },
  required: ["ids"],
});

/**
 * Mass operations select by an explicit id list only. TestIT also accepts filter-only
 * selections, which can hit every entity of a project - deliberately not exposed.
 */
function requireIds(args: ToolArgs): string[] {
  const ids = getOptionalStringArray(args, "ids");
  if (!ids || ids.length === 0) {
    throw new Error('"ids" must be a non-empty array of UUIDs.');
  }
  return ids;
}

const ENTITY_BULK = [
  { entity: "test_runs", label: "Test run", what: "test runs" },
  { entity: "test_plans", label: "Test plan", what: "test plans" },
  { entity: "configurations", label: "Configuration", what: "configurations" },
] as const;

type Action = "delete" | "restore" | "purge";

const ACTION_TEXT: Record<Action, string> = {
  delete: "Archive several %s at once (restore_%e undoes it).",
  restore: "Restore several archived %s at once.",
  purge: "Permanently delete several ARCHIVED %s at once. Irreversible.",
};

/** Opt-in toolset "bulk": mass delete/restore/purge and mass edits by explicit ids. */
export function createBulkTools(client: TestITApiClient): ToolBundle {
  const tools: ToolBundle["tools"] = [];
  const handlers: ToolBundle["handlers"] = {};

  for (const { entity, label, what } of ENTITY_BULK) {
    for (const action of ["delete", "restore", "purge"] as const) {
      const name = `${action}_${entity}`;
      tools.push({
        name,
        description: ACTION_TEXT[action].replace("%s", what).replace("%e", entity),
        inputSchema: idsSchema(label),
      });
      handlers[name] = async (rawArgs: unknown) => {
        const args = asObject(rawArgs);
        const ids = requireIds(args);
        const projectId = await resolveProjectId(args, client);
        if (entity === "test_plans") return api.bulkTestPlans(client, projectId, action, ids);
        if (entity === "configurations") return api.bulkConfigurations(client, projectId, action, ids);
        if (action === "delete") return api.deleteTestRuns(client, projectId, ids);
        if (action === "restore") return api.restoreTestRuns(client, projectId, ids);
        return api.purgeTestRuns(client, projectId, ids);
      };
    }
  }

  tools.push(
    {
      name: "set_test_runs",
      description:
        "Edit several test runs at once: description and/or tags. tagsAction: Add, Replace, ToRemove (remove the " +
        "given tags) or ClearAll.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ...idsSchema("Test run").properties,
          description: { type: "string" },
          tagsAction: { type: "string", enum: [...TAG_ACTIONS] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["ids"],
      },
    },
    {
      name: "delete_autotests",
      description:
        "Archive several autotests at once (no restore/purge for autotests). Returns {deletedCount, inProgressCount}.",
      inputSchema: idsSchema("Autotest"),
    },
  );

  handlers.set_test_runs = async (rawArgs: unknown) => {
    const args = asObject(rawArgs);
    const ids = requireIds(args);
    const changes: Record<string, unknown> = {};
    const description = getOptionalString(args, "description");
    if (description !== undefined) changes.description = description;
    const tagsAction = getOptionalString(args, "tagsAction");
    if (tagsAction !== undefined) {
      if (!(TAG_ACTIONS as readonly string[]).includes(tagsAction)) {
        throw new Error(`"tagsAction" must be one of: ${TAG_ACTIONS.join(", ")}.`);
      }
      const tags = getOptionalStringArray(args, "tags") ?? [];
      if (tagsAction !== "ClearAll" && tags.length === 0) {
        throw new Error(`"tags" is required for tagsAction ${tagsAction}.`);
      }
      changes.tagUpdateScheme = { action: tagsAction, tags: tags.map((name) => ({ name })) };
    }
    if (Object.keys(changes).length === 0) {
      throw new Error("Nothing to update: pass description and/or tagsAction.");
    }
    return api.updateTestRuns(client, await resolveProjectId(args, client), ids, changes);
  };
  handlers.delete_autotests = async (rawArgs: unknown) => {
    const args = asObject(rawArgs);
    return api.deleteAutoTests(client, await resolveProjectId(args, client), requireIds(args));
  };

  return { tools, handlers };
}
