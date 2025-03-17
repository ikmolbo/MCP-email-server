import { Tool, CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "./client-wrapper.js";
import { readEmailTool } from "./tools/email-read-tools.js";
import { sendEmailTool, replyAllEmailTool } from "./tools/email-send-tools.js";
import { searchEmailsTool, getRecentEmailsTool } from "./tools/email-search-tools.js";
import { 
  listLabelsTool, 
  getLabelTool, 
  createLabelTool, 
  updateLabelTool, 
  deleteLabelTool, 
  modifyLabelsTool,
  markAsReadTool,
  markAsUnreadTool, 
  archiveMessageTool, 
  unarchiveMessageTool,
  trashMessageTool
} from "./tools/email-label-tools.js";
import { getTimezoneInfoTool } from "./tools/timezone-tool.js";

export interface ToolHandler {
  (client: GmailClientWrapper, params: Record<string, unknown>): Promise<unknown>;
}

export type ExtendedTool = Tool & {
  handler: ToolHandler;
};

export const tools = [
  readEmailTool,
  sendEmailTool,
  replyAllEmailTool,
  searchEmailsTool,
  getRecentEmailsTool,
  
  // Label management tools
  listLabelsTool,
  getLabelTool,
  createLabelTool,
  updateLabelTool,
  deleteLabelTool,
  modifyLabelsTool,
  
  // Email state management tools
  markAsReadTool,
  markAsUnreadTool,
  archiveMessageTool,
  unarchiveMessageTool,
  trashMessageTool,
  
  // Timezone information tool
  getTimezoneInfoTool
] as ExtendedTool[];

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