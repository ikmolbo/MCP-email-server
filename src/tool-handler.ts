import { Tool, CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "./client-wrapper.js";
import { emailTools } from "./tools/email-tools.js";

export interface ToolHandler {
  (client: GmailClientWrapper, params: Record<string, unknown>): Promise<unknown>;
}

export interface ExtendedTool extends Tool {
  handler: ToolHandler;
}

export const tools = [...emailTools] as ExtendedTool[];

export function createToolHandler(client: GmailClientWrapper) {
  const toolMap = new Map<string, ExtendedTool>();
  
  // Register all tools
  for (const tool of tools) {
    toolMap.set(tool.name, tool);
  }

  return async (request: CallToolRequest): Promise<CallToolResult> => {
    const tool = toolMap.get(request.params.name);
    
    if (!tool) {
      throw new Error(`Tool '${request.params.name}' not found`);
    }

    try {
      const result = await tool.handler(client, request.params.arguments || {});
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Tool execution failed: ${error}`
        }],
        isError: true
      };
    }
  };
} 