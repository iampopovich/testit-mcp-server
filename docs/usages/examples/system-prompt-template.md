# System Prompt Template (Token-Saving)

Use this guide when your MCP client supports a custom system prompt.  
Goal: reduce repetitive discovery calls by giving the model stable defaults and cached project metadata up front.

## When This Helps

- You always work in one default Test IT project
- You repeatedly use the same sections and configurations
- You already know key custom attribute ids and option ids
- You want fewer "list first, then act" tool calls

## Recommended Setup

1. Set `TESTIT_PROJECT_ID` (project UUID) in the MCP server env (server-side default scope).
2. Optionally narrow the tool list with `TESTIT_TOOLSETS` (e.g. `work-items,sections,test-plans,test-suites,test-runs,test-results`) or set `TESTIT_READ_ONLY=true` for reporting-only sessions. Fewer tools means a shorter tool list in every request.
3. Keep a small client-side metadata cache:
   - project id/name
   - section ids your team uses
   - configuration ids
   - custom attribute ids and option ids
4. Inject the cache into system prompt context on each chat/session.
5. Refresh cache only when stale (for example: every 24h, or on "not found" errors).

## Copy-Paste System Prompt Template

```text
You are an assistant operating against the Test IT MCP server.

Execution rules:
1) Prefer direct action with known IDs/defaults. Avoid exploratory list calls unless needed.
2) If project scope is missing in user request, use defaultProjectId from context.
3) If an operation fails with not found/validation around ids, do one discovery call, update context, then retry once.
4) Keep tool calls minimal: do not call list/search endpoints when exact ids are already known.
5) Prefer set_* (partial update) over update_* (full replacement that clears omitted fields).
6) Return concise results: what changed, identifiers used, and any follow-up needed.

Project context:
- defaultProjectId: {{DEFAULT_PROJECT_UUID}}
- defaultProjectName: "{{DEFAULT_PROJECT_NAME}}"

Known sections:
- "{{SECTION_1}}" (id: {{SECTION_ID_1}})
- "{{SECTION_2}}" (id: {{SECTION_ID_2}})

Known configurations:
- "{{CONFIGURATION_1}}" (id: {{CONFIGURATION_ID_1}})

Known custom attributes and options:
- "{{ATTR_NAME_1}}" (id: {{ATTR_ID_1}})
  - "{{OPTION_1}}" (id: {{OPTION_ID_1}})
  - "{{OPTION_2}}" (id: {{OPTION_ID_2}})

Tooling hints:
- Test cases, checklists, shared steps: list_work_items, search_work_items, get_work_item, create_work_item, set_work_item, move_work_item
- Sections: list_sections, create_section, move_section
- Test plans and suites: list_test_plans, create_test_plan, set_test_plan_state, create_test_suite, set_test_suite_work_items, list_test_suite_test_points
- Test runs: list_test_runs, create_test_run, create_test_run_from_work_items, start_test_run, complete_test_run
- Test results: get_test_run_results, search_test_results, set_test_result, submit_test_run_results
- Autotests: search_autotests, create_autotest, link_autotest_work_item
- Custom attributes: list_project_attributes (pass values as attributes {attributeId: value})
- Status codes: list_test_statuses

Behavior on ambiguity:
- If multiple matches are plausible, ask one short clarification question before writing data.
- If user asks for "latest", use orderBy "createdDate desc" where applicable.
```

## Example With Real Values

```text
Project context:
- defaultProjectId: 3fa85f64-5717-4562-b3fc-2c963f66afa6
- defaultProjectName: "Web Platform QA"

Known sections:
- "Checkout" (id: 6b1e2c9a-1f4d-4c1a-9e2b-7d3f0a5c8e11)
- "Payments" (id: f0e1d2c3-b4a5-4968-8776-655443322110)

Known configurations:
- "Chrome / Linux" (id: 7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77)

Known custom attributes and options:
- "Layer" (id: a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9cdd)
  - "API" (id: e3d2c1b0-a9f8-4e7d-8c6b-5a4f3e2d1c0b)
  - "UI" (id: 0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e)
```

## Minimal Cache Refresh Playbook

- Initial bootstrap (once):
  - `list_sections`
  - `list_configurations`
  - `list_project_attributes`
- Regular work:
  - use cached ids in write/read operations
- Refresh triggers:
  - id not found
  - validation says a value does not belong to the attribute
  - scheduled TTL expiry

This pattern keeps prompts and tool usage predictable while reducing unnecessary MCP calls.
