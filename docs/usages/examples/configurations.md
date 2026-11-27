# Configurations Example

A configuration describes the environment a test is run in (for example browser and OS). Every project has a default configuration; test points and test results are always bound to one.

## Example User Prompts

- `Which configurations exist in the default project?`
- `Create a "Chrome / Linux" configuration and use it in the "Checkout" suite.`
- `Which browser values are defined as configuration parameters?`

## Typical Tools

- `list_configurations`
- `search_configurations`
- `get_configuration`
- `create_configuration`
- `set_configuration`
- `search_configuration_parameters`
- `create_configuration_parameter`
- `set_test_suite_configurations`
- `list_test_plan_configurations`

## Example Calls

List configurations of a project:

```json
{
  "name": "list_configurations",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

Create a configuration with parameters:

```json
{
  "name": "create_configuration",
  "arguments": {
    "name": "Chrome / Linux",
    "parameters": { "browser": "chrome", "os": "linux" }
  }
}
```

List configuration parameters and their allowed values:

```json
{
  "name": "search_configuration_parameters",
  "arguments": {
    "name": "browser"
  }
}
```

Use configurations in a test suite (replaces the current list):

```json
{
  "name": "set_test_suite_configurations",
  "arguments": {
    "id": "5e2d1c0b-9a8f-4e7d-b6c5-a4b3c2d1e066",
    "configurationIds": ["7c6b5a49-3e2d-4f1c-8b0a-9e8d7c6b5a77"]
  }
}
```

## Notes

- `set_configuration` changes only the fields you pass; `update_configuration` is a full replacement.
- To check whether a failure is environment-specific, filter `search_test_results` or `get_autotest_results_history` by `configurationIds`.
- `delete_configuration` archives; `restore_configuration` and `purge_configuration` undo or finalize it.
