# Shared Steps Example

A shared step is a work item with `entityTypeName: "SharedSteps"`. Test cases reference it from a step via `workItemId` instead of an `action`.

## Example User Prompt

`Create a shared step "Log in as standard user", use it as the first step of a new test case, and show where it is used.`

## Typical Tools

- `list_shared_steps`
- `get_shared_step`
- `create_work_item`
- `set_work_item`
- `list_shared_step_references`

## Example Calls

List shared steps of a project:

```json
{
  "name": "list_shared_steps",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Log in",
    "take": 20
  }
}
```

Create a shared step:

```json
{
  "name": "create_work_item",
  "arguments": {
    "entityTypeName": "SharedSteps",
    "name": "Log in as standard user",
    "steps": [
      { "action": "Open /login", "expected": "Login form is shown" },
      { "action": "Submit valid credentials", "expected": "Dashboard is shown" }
    ]
  }
}
```

The server always sends `duration: 0` for shared steps, as Test IT requires.

Use it in a test case:

```json
{
  "name": "create_work_item",
  "arguments": {
    "name": "Profile - change display name",
    "steps": [
      { "workItemId": "d41f8a2c-7e6b-4c3d-9a1e-2b5f0c8d7e32" },
      { "action": "Change display name and save", "expected": "New name is shown in the header" }
    ]
  }
}
```

Where is it used:

```json
{
  "name": "list_shared_step_references",
  "arguments": {
    "id": "d41f8a2c-7e6b-4c3d-9a1e-2b5f0c8d7e32",
    "target": "workItems"
  }
}
```

## Notes

- `list_shared_step_references` with `target: "sections"` lists sections that use the step in their pre/postconditions.
- Rename or re-prioritize a shared step with `set_work_item`; it is a regular work item.
