# Test Runs Example

## Example User Prompt

`Create a test run for today's regression in the default project, start it, and later complete it.`

## Typical Tools

- `list_test_runs`
- `search_test_runs`
- `get_test_run`
- `create_test_run`
- `create_test_run_from_work_items`
- `create_test_run_from_autotests`
- `start_test_run`
- `stop_test_run`
- `complete_test_run`
- `set_test_run`
- `get_test_run_results`

## Example Calls

Create an empty test run:

```json
{
  "name": "create_test_run",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Regression - 2026-03-03",
    "tags": ["regression"],
    "launchSource": "https://ci.example.com/jobs/1234"
  }
}
```

Create a run inside a test plan for automated work items and configurations:

```json
{
  "name": "create_test_run_from_work_items",
  "arguments": {
    "testPlanId": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55",
    "workItemIds": ["9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21"],
    "configurationIds": ["7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77"],
    "name": "Nightly - Chrome"
  }
}
```

Start, then complete:

```json
{
  "name": "start_test_run",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"
  }
}
```

```json
{
  "name": "complete_test_run",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"
  }
}
```

Find runs in progress by name:

```json
{
  "name": "search_test_runs",
  "arguments": {
    "name": "Regression",
    "states": ["InProgress"],
    "take": 20
  }
}
```

## Notes

- `create_test_run_from_work_items` and `create_test_run_from_test_points` accept only automated work items (linked to an autotest, see [Autotests](./autotests.md)). Test IT rejects manual ones.
- `create_test_run_from_autotests` creates a run that is not bound to a test plan.
- `delete_test_run` archives a run; use `restore_test_run` to undo or `purge_test_run` to delete it permanently.
- Run state: `NotStarted` -> `InProgress` -> `Stopped` / `Completed`.
