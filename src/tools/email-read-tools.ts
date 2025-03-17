import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { extractEmailContent, getAttachments, GmailMessagePart } from "../utils.js";

// Schema definition
const ReadEmailSchema = z.object({
  messageId: z.string().describe("ID of the email message to retrieve"),
});

export const readEmailTool: Tool = {
  name: "read_email",
  description: "Read a specific email by ID and extract its content",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email message to retrieve"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    const email = await client.getMessage(params.messageId);
    
    return {
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      content: email.content,
      isUnread: email.labels?.includes('UNREAD') || false,
      isInInbox: email.labels?.includes('INBOX') || false,
      category: email.category,
      labels: email.labels,
      attachments: email.attachments?.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType
      }))
    };
  }
}; 