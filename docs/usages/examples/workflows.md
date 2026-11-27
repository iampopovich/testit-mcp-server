# Workflow Example

An end-to-end regression cycle: test plan -> suite -> test run -> results -> triage. (This page is about chaining tools; Test IT status workflows are read with `list_workflows` / `get_workflow` from the opt-in `admin` toolset.)

## Example User Prompt

`In the default project, run the "Release 2.4 regression" plan on Chrome for its automated test cases, then list the failures and mark the ones caused by the sandbox outage as blocked.`

## Typical Tool Sequence

1. `list_test_plans`
2. `list_test_plan_test_suites`
3. `list_configurations`
4. `create_test_run_from_work_items`
5. `submit_test_run_results` (usually done by CI)
6. `search_test_results`
7. `set_test_result`
8. `get_test_run_statistics`

## Example Calls

Find the plan:

```json
{
  "name": "list_test_plans",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

Create the run for automated work items x configuration:

```json
{
  "name": "create_test_run_from_work_items",
  "arguments": {
    "testPlanId": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55",
    "workItemIds": ["9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21"],
    "configurationIds": ["7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77"],
    "name": "Nightly Regression - 2026-03-03"
  }
}
```

List failed results:

```json
{
  "name": "search_test_results",
  "arguments": {
    "testRunIds": ["2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"],
    "outcomes": ["Failed"],
    "take": 20
  }
}
```

Mark one as blocked:

```json
{
  "name": "set_test_result",
  "arguments": {
    "id": "8f9e0d1c-2b3a-4c5d-8e7f-6a5b4c3d2e99",
    "statusCode": "BLOCKED",
    "comment": "Payment sandbox outage"
  }
}
```

Final numbers:

```json
{
  "name": "get_test_run_statistics",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"
  }
}
```
