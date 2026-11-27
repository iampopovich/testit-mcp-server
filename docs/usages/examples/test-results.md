# Test Results Example

## Example User Prompt

`Show the failed results of test run 2b3c4d5e-..., mark one as blocked with a comment and attach a screenshot.`

## Typical Tools

- `get_test_run_results`
- `search_test_results`
- `get_test_result`
- `set_test_result`
- `submit_test_run_results`
- `get_test_results_statistics`
- `get_test_result_reruns`
- `upload_test_result_attachment`
- `list_test_statuses`

## Example Calls

All results of a run:

```json
{
  "name": "get_test_run_results",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"
  }
}
```

Search failed results in a run:

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

Change selected fields of one result (status and comment):

```json
{
  "name": "set_test_result",
  "arguments": {
    "id": "8f9e0d1c-2b3a-4c5d-8e7f-6a5b4c3d2e99",
    "statusCode": "BLOCKED",
    "comment": "Blocked by payment sandbox outage"
  }
}
```

Send autotest results into a run:

```json
{
  "name": "submit_test_run_results",
  "arguments": {
    "id": "2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888",
    "results": [
      {
        "autoTestExternalId": "checkout.card_payment_success",
        "configurationId": "7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77",
        "statusCode": "FAILED",
        "message": "Timeout waiting for confirmation page",
        "duration": 15230
      }
    ]
  }
}
```

Counts by status for a run:

```json
{
  "name": "get_test_results_statistics",
  "arguments": {
    "testRunIds": ["2b3c4d5e-6f70-4812-9a3b-c4d5e6f70888"]
  }
}
```

## Notes

- To change a result status use `statusCode`; patching `outcome` is ignored by Test IT. `list_test_statuses` returns all codes, including custom ones.
- `update_test_result` is a full replacement and clears fields you do not send; prefer `set_test_result`.
- For screenshots and logs use `upload_test_result_attachment` (see [Attachments](./attachments.md)).
