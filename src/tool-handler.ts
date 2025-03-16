import { Tool, CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "./client-wrapper.js";
import { emailTools } from "./tools/email-tools.js";

export interface ToolHandler {
  (client: GmailClientWrapper, params: Record<string, unknown>): Promise<unknown>;
}

export type ExtendedTool = Tool & {
  handler: ToolHandler;
};

export const tools = Object.values(emailTools) as ExtendedTool[];

export function createToolHandler(client: GmailClientWrapper) {
  return async (request: CallToolRequest): Promise<CallToolResult> => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }

    const result = await tool.handler(client, request.params.arguments || {});
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  };
} 