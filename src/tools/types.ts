/** MCP tool annotations (hints for clients; see MCP spec ToolAnnotations). */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations?: ToolAnnotations;
}

export type ToolHandler = (args: unknown) => Promise<unknown>;

export interface ToolBundle {
  tools: McpToolDefinition[];
  handlers: Record<string, ToolHandler>;
}


