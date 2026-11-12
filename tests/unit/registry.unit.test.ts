import { describe, expect, it } from "vitest";
import { buildToolRegistry } from "../../src/server-bootstrap.js";
import { createRecordingClient, expectObjectSchemas, expectToolHandlerParity } from "./tool-test-helpers.js";

describe("tool registry", () => {
  it("has unique tool names, a handler per tool and valid object schemas", () => {
    const client = createRecordingClient();
    const { tools, handlers } = buildToolRegistry(client as never);
    const bundle = { tools, handlers: Object.fromEntries(handlers) };
    expectToolHandlerParity(bundle);
    expectObjectSchemas(bundle);
    expect(tools.length).toBeGreaterThan(0);
  });
});
