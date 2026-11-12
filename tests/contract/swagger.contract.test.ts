/**
 * Contract test: every tool must call only endpoints that exist in the TestIT
 * OpenAPI spec, are not deprecated, and must send only query params the
 * endpoint declares.
 *
 * The spec is NOT stored in the repo. Point TESTIT_SWAGGER at a local copy
 * (e.g. .local/apidocs/swagger.json); without it the suite is skipped.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../src/server-bootstrap.js";
import { createRecordingClient, definedQuery, SAMPLE_UUID, sampleArgs } from "../unit/tool-test-helpers.js";

interface SpecOperation {
  deprecated?: boolean;
  parameters?: Array<{ name: string; in: string }>;
}
type SpecPaths = Record<string, Record<string, SpecOperation>>;

const specPath = process.env.TESTIT_SWAGGER;
const specAvailable = Boolean(specPath && existsSync(specPath));

/**
 * Known contract violations still to be fixed. Each fix iteration removes
 * entries; the test fails if an entry is no longer needed (stale allowlist).
 */
const KNOWN_VIOLATIONS: Record<string, string> = {
  delete_section: "DELETE /sections/{id} is deprecated but has no replacement in the API",
};

/** Extra args for tools that need more than their required fields to make a call. */
const EXTRA_ARGS: Record<string, Record<string, unknown>> = {
  set_test_result: { comment: "x" },
  set_configuration: { name: "x" },
  set_work_item: { name: "x" },
  set_test_run: { name: "x" },
};

/** Canned responses for tools that read before they write ("METHOD path" -> body). */
const PRESET_RESPONSES: Record<string, Record<string, unknown>> = {
  create_section: { [`GET /api/v2/projects/${SAMPLE_UUID}/sections`]: [{ id: "root", parentId: null }] },
  move_section: { [`GET /api/v2/sections/${SAMPLE_UUID}`]: { id: SAMPLE_UUID, parentId: "old-parent" } },
};

function findTemplate(paths: SpecPaths, method: string, path: string): string | undefined {
  const candidates = Object.keys(paths).filter((template) => {
    if (!paths[template][method.toLowerCase()]) {
      return false;
    }
    const pattern = new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`);
    return pattern.test(path);
  });
  // Prefer the most literal template (fewest placeholders).
  candidates.sort((a, b) => (a.match(/\{/g)?.length ?? 0) - (b.match(/\{/g)?.length ?? 0));
  return candidates[0];
}

function violationsFor(paths: SpecPaths, calls: ReturnType<typeof createRecordingClient>["calls"]): string[] {
  const problems: string[] = [];
  for (const call of calls) {
    const template = findTemplate(paths, call.method, call.path);
    if (!template) {
      problems.push(`${call.method} ${call.path} is not in the spec`);
      continue;
    }
    const op = paths[template][call.method.toLowerCase()];
    if (op.deprecated) {
      problems.push(`${call.method} ${template} is deprecated`);
    }
    const allowed = new Set((op.parameters ?? []).filter((p) => p.in === "query").map((p) => p.name));
    for (const key of Object.keys(definedQuery(call.query))) {
      if (!allowed.has(key)) {
        problems.push(`${call.method} ${template}: unknown query param "${key}"`);
      }
    }
  }
  return problems;
}

describe.skipIf(!specAvailable)("contract: tools vs TestIT OpenAPI spec", () => {
  const spec = specAvailable ? JSON.parse(readFileSync(specPath as string, "utf8")) : { paths: {} };
  const paths = spec.paths as SpecPaths;
  const { tools } = buildToolRegistry(createRecordingClient() as never);

  for (const tool of tools) {
    it(tool.name, async () => {
      const client = createRecordingClient();
      for (const [key, value] of Object.entries(PRESET_RESPONSES[tool.name] ?? {})) {
        client.responses.set(key, value);
      }
      const { handlers } = buildToolRegistry(client as never);
      const args = { ...sampleArgs(tool.inputSchema), ...EXTRA_ARGS[tool.name] };
      // Exercise advertised paging params so unsupported ones get caught.
      const props = tool.inputSchema.properties ?? {};
      if ("take" in props) args.take = 5;
      if ("skip" in props) args.skip = 5;
      if ("orderBy" in props) args.orderBy = "createdDate desc";
      if ("searchField" in props) args.searchField = "name";
      if ("searchValue" in props) args.searchValue = "x";
      await handlers.get(tool.name)?.(args);
      expect(client.calls.length, "tool made no HTTP calls").toBeGreaterThan(0);

      const problems = violationsFor(paths, client.calls);
      if (tool.name in KNOWN_VIOLATIONS) {
        expect(problems, `stale KNOWN_VIOLATIONS entry: ${KNOWN_VIOLATIONS[tool.name]}`).not.toEqual([]);
      } else {
        expect(problems).toEqual([]);
      }
    });
  }
});
