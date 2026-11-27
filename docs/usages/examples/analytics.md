# Analytics Example

## Example User Prompts

- `How are the test plans of the default project doing?`
- `Give me pass/fail numbers for test plan 1a7e5c3b-...`
- `Summarize test run 2b3c4d5e-... by status.`

## Typical Tools

- `get_project_analytics`
- `get_test_plan_analytics`
- `get_test_plan_summary`
- `get_test_run_statistics`
- `get_test_results_statistics`
- `get_autotest_average_duration`

## Example Calls

Analytics for all test plans of a project:

```json
{
  "name": "get_project_analytics",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

One test plan:

```json
{
  "name": "get_test_plan_analytics",
  "arguments": {
    "id": "1a7e5c3b-2d4f-4e6a-8b9c-0d1e2f3a4b55"
  }
}
```

Result statistics of a test run:

```json
{
  "name": "get_test_run_statistics",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"
  }
}
```

Statistics over several runs:

```json
{
  "name": "get_test_results_statistics",
  "arguments": {
    "testRunIds": [
      "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888",
      "3c4d5e6f-7081-4923-ab4c-d5e6f7081999"
    ]
  }
}
```

## Notes

- `get_test_plan_summary` adds planned vs spent duration and the manual/automated split of test points.
- All analytics tools are read-only and stay available with `TESTIT_READ_ONLY=true`.
