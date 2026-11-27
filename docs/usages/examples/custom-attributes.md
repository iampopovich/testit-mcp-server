# Custom Attributes Example

Test IT custom attributes are extra fields on work items and test plans. Attribute ids are UUIDs; values are passed as `attributes: { "<attributeId>": <value> }`.

## Example User Prompt

`Find the "Layer" attribute in the default project and create a test case with Layer = API.`

## Typical Tools

- `list_project_attributes`
- `create_work_item`
- `create_test_plan`

Admin toolset (enable with `TESTIT_TOOLSETS=default,admin`):

- `search_custom_attributes`
- `get_custom_attribute`
- `create_project_attribute`
- `create_global_attribute`
- `link_project_global_attributes`
- `list_test_plan_attributes`

## Example Calls

List attributes of a project (id, type, options):

```json
{
  "name": "list_project_attributes",
  "arguments": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
}
```

Create a test case with an attribute value (for an options attribute use the option id):

```json
{
  "name": "create_work_item",
  "arguments": {
    "name": "Orders API - create order",
    "attributes": {
      "a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9cdd": "e3d2c1b0-a9f8-4e7d-8c6b-5a4f3e2d1c0b"
    }
  }
}
```

Create a project attribute (admin toolset):

```json
{
  "name": "create_project_attribute",
  "arguments": {
    "name": "Layer",
    "type": "options",
    "options": ["API", "UI", "E2E"],
    "defaultOption": "API"
  }
}
```

## Notes

- Attribute types: `string`, `datetime`, `options`, `user`, `multipleOptions`, `checkbox`.
- A global attribute must be linked to a project (`link_project_global_attributes`) before work items there can use it.
- The Test IT API has no restore or purge for deleted attributes.
