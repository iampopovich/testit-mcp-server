# Autotests Example

An autotest is the Test IT record of a test in your code, identified by `externalId`. Linking it to a work item makes that work item automated, which is required to create test runs from a test plan.

## Example User Prompts

- `Register autotest "checkout.card_payment_success" and link it to test case 9c2f7e10-...`
- `Which autotests are flaky in the default project?`
- `Show the last 20 results of this autotest.`

## Typical Tools

- `search_autotests`
- `get_autotest`
- `create_autotest`
- `link_autotest_work_item`
- `get_autotest_results_history`
- `set_autotests_flaky`
- `create_test_run_from_autotests`

## Example Calls

Create and link in one call:

```json
{
  "name": "create_autotest",
  "arguments": {
    "externalId": "checkout.card_payment_success",
    "name": "card_payment_success",
    "namespace": "tests.checkout",
    "classname": "TestCardPayment",
    "workItemIds": ["9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21"]
  }
}
```

Find flaky autotests:

```json
{
  "name": "search_autotests",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "isFlaky": true,
    "take": 50
  }
}
```

Result history, failures only:

```json
{
  "name": "get_autotest_results_history",
  "arguments": {
    "id": "4d5e6f70-8192-4a3b-bc4d-5e6f708192aa",
    "statusCodes": ["FAILED"],
    "take": 20
  }
}
```

Run autotests outside a test plan:

```json
{
  "name": "create_test_run_from_autotests",
  "arguments": {
    "autoTestExternalIds": ["checkout.card_payment_success"],
    "configurationIds": ["7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77"],
    "name": "Checkout autotests"
  }
}
```

## Notes

- Results are sent by `externalId` with `submit_test_run_results` (see [Test Results](./test-results.md)).
- `externalId` is the result-matching key and cannot be changed with `set_autotest`.
- Archived autotests are found only via `search_autotests` with `isDeleted: true`.
