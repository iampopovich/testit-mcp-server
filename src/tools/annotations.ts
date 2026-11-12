import type { ToolAnnotations } from "./types.js";

/**
 * Tool behaviour derived from the tool-name verb. Every tool name must start
 * with one of these verbs; unknown verbs throw so new tools get classified.
 *
 * - readOnly: no side effects;
 * - destructive: may delete data or overwrite it (delete/purge archive or
 *   remove; update_* are full PUT replacements that clear omitted fields);
 * - idempotent: repeating the call with the same args has no extra effect.
 */
const VERB_ANNOTATIONS: Record<string, ToolAnnotations> = {
  list: { readOnlyHint: true },
  get: { readOnlyHint: true },
  search: { readOnlyHint: true },
  create: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  submit: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  upload: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  start: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  stop: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  complete: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  restore: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  rename: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  move: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  set: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  update: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  delete: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  purge: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
};

export function annotationsFor(toolName: string): ToolAnnotations {
  const verb = toolName.split("_")[0];
  const annotations = VERB_ANNOTATIONS[verb];
  if (!annotations) {
    throw new Error(`Tool "${toolName}" has no annotation rule for verb "${verb}".`);
  }
  // All tools talk to an external TestIT instance.
  return { ...annotations, openWorldHint: true };
}
