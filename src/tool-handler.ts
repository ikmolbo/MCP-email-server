import { Tool, CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "./client-wrapper.js";
import { readEmailTool } from "./tools/email-read-tools.js";
import { sendEmailTool } from "./tools/email-send-tools.js";
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
import * as timezoneTools from './tools/timezone-tool.js';
import { z } from 'zod';

export interface ToolHandler {
  (client: GmailClientWrapper, params: Record<string, unknown>): Promise<unknown>;
}

export type ExtendedTool = Tool & {
  handler: ToolHandler;
};

// Create timezone tool schema
const getTimeZoneSchema = {
  type: "object" as const,
  properties: {}
};

// Define timezone tool
const getTimeZoneTool: ExtendedTool = {
  name: "get_timezone",
  description: "Get current timezone settings and time information",
  inputSchema: getTimeZoneSchema,
  handler: timezoneTools.getCurrentTimeZone
};

export const tools = [
  readEmailTool,
  sendEmailTool,
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
  
  // Timezone tool
  getTimeZoneTool
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