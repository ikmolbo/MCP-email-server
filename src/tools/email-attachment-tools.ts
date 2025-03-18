import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";

/**
 * Schema pentru obținerea unui atașament
 */
const GetAttachmentSchema = z.object({
  messageId: z.string().describe("ID-ul mesajului care conține atașamentul"),
  attachmentId: z.string().describe("ID-ul atașamentului"),
});

/**
 * Schema pentru listarea atașamentelor unui email
 */
const ListAttachmentsSchema = z.object({
  messageId: z.string().describe("ID-ul mesajului pentru care se listează atașamentele"),
});

/**
 * Tool pentru obținerea unui atașament specific
 */
export const getAttachmentTool: Tool = {
  name: "get_attachment",
  description: "Obține un atașament specific dintr-un email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID-ul mesajului care conține atașamentul"
      },
      attachmentId: {
        type: "string",
        description: "ID-ul atașamentului"
      }
    },
    required: ["messageId", "attachmentId"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    attachmentId: string;
  }) => {
    try {
      const attachment = await client.getAttachment(params.messageId, params.attachmentId);
      
      return {
        messageId: params.messageId,
        attachmentId: params.attachmentId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        data: attachment.data
      };
    } catch (error) {
      throw new Error(`Failed to get attachment: ${error}`);
    }
  }
};

/**
 * Tool pentru listarea atașamentelor unui email
 */
export const listAttachmentsTool: Tool = {
  name: "list_attachments",
  description: "Listează toate atașamentele dintr-un email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID-ul mesajului pentru care se listează atașamentele"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    try {
      const attachments = await client.listAttachments(params.messageId);
      
      return {
        messageId: params.messageId,
        count: attachments.length,
        attachments: attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size
        }))
      };
    } catch (error) {
      throw new Error(`Failed to list attachments: ${error}`);
    }
  }
}; 