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
 * Schema pentru salvarea unui atașament în sistemul de fișiere
 */
const SaveAttachmentSchema = z.object({
  messageId: z.string().describe("ID-ul mesajului care conține atașamentul"),
  attachmentId: z.string().describe("ID-ul atașamentului"),
  targetPath: z.string().describe("Calea unde va fi salvat atașamentul"),
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

/**
 * Tool pentru salvarea unui atașament în sistemul de fișiere local
 */
export const saveAttachmentTool: Tool = {
  name: "save_attachment",
  description: "Salvează un atașament dintr-un email în sistemul de fișiere",
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
      },
      targetPath: {
        type: "string",
        description: "Calea unde va fi salvat atașamentul"
      }
    },
    required: ["messageId", "attachmentId", "targetPath"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    attachmentId: string;
    targetPath: string;
  }) => {
    try {
      // Obținem atașamentul
      const attachment = await client.getAttachment(params.messageId, params.attachmentId);
      
      // Pregătim datele pentru a fi transmise către MCP Filesystem
      return {
        messageId: params.messageId,
        attachmentId: params.attachmentId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        targetPath: params.targetPath,
        fsData: {
          filename: attachment.filename,
          targetPath: params.targetPath,
          contentType: attachment.mimeType,
          // Furnizăm datele pentru sistemul de fișiere
          content: attachment.data,
          // Indicații pentru utilizarea cu MCP Filesystem
          fsCommand: "write_file"
        },
        success: true,
        message: `Atașamentul "${attachment.filename}" (${attachment.size} bytes) este pregătit pentru salvare la "${params.targetPath}". Folosește comanda write_file din Filesystem MCP cu datele de mai sus.`
      };
    } catch (error) {
      throw new Error(`Failed to save attachment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 