# Test Plans Example

A Test IT test plan contains test suites; a suite holds work items, and each work item x configuration becomes a **test point** that a tester executes.

## Example User Prompt

`Create a test plan "Release 2.4 regression", add a suite with three test cases, assign a tester to its test points and start the plan.`

## Typical Tools

- `list_test_plans`
- `get_test_plan`
- `create_test_plan`
- `set_test_plan_state`
- `create_test_plan_clone`
- `create_test_suite`
- `set_test_suite_work_items`
- `set_test_suite_configurations`
- `list_test_suite_test_points`
- `assign_test_points_tester`
- `get_test_plan_summary`

## Example Calls

Create a plan:

```json
{
  "name": "create_test_plan",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Release 2.4 regression",
    "build": "2.4.0-rc1",
    "tags": ["release"]
  }
}
```

Add a suite and fill it with work items:

```json
{
  "name": "create_test_suite",
  "arguments": {
    "testPlanId": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55",
    "name": "Checkout"
  }
}
```

```json
{
  "name": "set_test_suite_work_items",
  "arguments": {
    "id": "5e2d1c0b-9a8f-4e7d-b6c5-a4b3c2d1e066",
    "workItemIds": [
      "9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21",
      "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      "5f6e7d8c-9b0a-4f1e-8d2c-3b4a5f6e7d8c"
    ]
  }
}
```

List the test points, then assign a tester:

```json
{
  "name": "list_test_suite_test_points",
  "arguments": {
    "id": "5e2d1c0b-9a8f-4e7d-b6c5-a4b3c2d1e066"
  }
}
```

```json
{
  "name": "assign_test_points_tester",
  "arguments": {
    "id": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55",
    "userId": "c0ffee00-1234-4abc-9def-0123456789cc",
    "testPointIds": ["b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e"]
  }
}
```

Start the plan and check its totals:

```json
{
  "name": "set_test_plan_state",
  "arguments": {
    "id": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55",
    "action": "start"
  }
}
```

```json
{
  "name": "get_test_plan_summary",
  "arguments": {
    "id": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55"
  }
}
```

## Notes

- `set_test_suite_work_items` replaces the suite's list; send the full list each time.
- Test IT has no user list API: take user ids from existing entities (`createdById`, `testerId`).
- `set_test_plan_state` actions: `start`, `pause`, `complete`.
- `delete_test_plan` archives a plan; `restore_test_plan` and `purge_test_plan` undo or finalize it.
