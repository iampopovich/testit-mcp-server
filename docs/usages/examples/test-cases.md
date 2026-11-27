# Test Cases (Work Items) Example

In Test IT, test cases, checklists and shared steps are all **work items**. They differ by `entityTypeName` (`TestCases`, `CheckLists`, `SharedSteps`). Projects, sections and work items are addressed by UUID; work items also have a numeric global ID shown in the UI.

## Example User Prompt

`List the first 10 ready test cases in the default project whose name contains "checkout", then raise the priority of the first one to High.`

## Typical Tools

- `list_work_items`
- `search_work_items`
- `get_work_item`
- `create_work_item`
- `set_work_item`
- `move_work_item`
- `delete_work_item`
- `restore_work_item`
- `get_work_item_history`
- `get_work_item_test_results_history`

## Example Calls

List test cases of a project by name, type and state:

```json
{
  "name": "list_work_items",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "checkout",
    "types": ["TestCases"],
    "states": ["Ready"],
    "page": 1,
    "size": 10
  }
}
```

Search across projects by name part or global ID:

```json
{
  "name": "search_work_items",
  "arguments": {
    "projectIds": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    "nameOrId": "checkout",
    "priorities": ["High", "Highest"],
    "tags": ["smoke"],
    "take": 20
  }
}
```

Create a test case with steps in a section:

```json
{
  "name": "create_work_item",
  "arguments": {
    "name": "Checkout - card payment success",
    "sectionId": "6b1e2c9a-1f4d-4c1a-9e2b-7d3f0a5c8e11",
    "priority": "High",
    "state": "Ready",
    "tags": ["checkout", "smoke"],
    "steps": [
      { "action": "Add an item to the cart", "expected": "Cart shows 1 item" },
      { "action": "Pay with a valid test card", "expected": "Order confirmation page is shown" }
    ]
  }
}
```

`projectId` is omitted here, so `TESTIT_PROJECT_ID` is used. Defaults: `entityTypeName=TestCases`, `state=NotReady`, `priority=Medium`, `duration=60000` ms.

Partial update (only the given fields change, a new version is created):

```json
{
  "name": "set_work_item",
  "arguments": {
    "id": "9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21",
    "name": "Checkout - card payment success (happy path)",
    "priority": "High"
  }
}
```

Move to another section:

```json
{
  "name": "move_work_item",
  "arguments": {
    "id": "9c2f7e10-4a3b-4d8e-b1f2-0e6a5d4c3b21",
    "sectionId": "6b1e2c9a-1f4d-4c1a-9e2b-7d3f0a5c8e11"
  }
}
```

## Notes

- Prefer `set_work_item` over `update_work_item`: the latter is a full replacement (PUT), and fields you do not send are cleared.
- `delete_work_item` archives the item; `restore_work_item` brings it back; `purge_work_item` removes an archived item for good.
- Use `list_sections` to find `sectionId` values (see [Sections](./sections.md)) and `list_project_attributes` for custom attribute ids (see [Custom Attributes](./custom-attributes.md)).
