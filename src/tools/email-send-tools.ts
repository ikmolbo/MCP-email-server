import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { createEmailMessage } from "../utils.js";

// Schema definition
const SendEmailSchema = z.object({
  to: z.array(z.string()).describe("List of recipient email addresses"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body content"),
  cc: z.array(z.string()).optional().describe("List of CC recipients"),
  bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
  inReplyTo: z.string().optional().describe("Message ID to reply to"),
  threadId: z.string().optional().describe("Thread ID to add the message to"),
});

export const sendEmailTool: Tool = {
  name: "send_email",
  description: "Send a new email message",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "List of recipient email addresses"
      },
      subject: {
        type: "string",
        description: "Email subject"
      },
      body: {
        type: "string",
        description: "Email body content"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "List of CC recipients"
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "List of BCC recipients"
      },
      inReplyTo: {
        type: "string",
        description: "Message ID to reply to"
      },
      threadId: {
        type: "string",
        description: "Thread ID to add the message to"
      }
    },
    required: ["to", "subject", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
    threadId?: string;
  }) => {
    // If this is a reply, get the original message details
    let references: string[] = [];
    let fromAddress: string | undefined;
    
    if (params.inReplyTo) {
      // Get original message details
      const originalEmail = await client.getMessage(params.inReplyTo);
      
      // Extract any existing references
      if (originalEmail.headers) {
        const existingRefs = originalEmail.headers.find(h => h.name?.toLowerCase() === 'references')?.value;
        const messageId = originalEmail.headers.find(h => h.name?.toLowerCase() === 'message-id')?.value;
        
        if (existingRefs) {
          references = existingRefs.split(/\s+/);
        }
        if (messageId) {
          references.push(messageId.replace(/[<>]/g, ''));
        }
      }
      
      // Get send-as aliases to find correct reply-from address
      const aliases = await client.getSendAsAliases();
      if (originalEmail.to && originalEmail.to.length > 0) {
        // Try to find matching alias for the original recipient
        let emailAddress = originalEmail.to[0];
        const match = emailAddress.match(/<([^>]+)>/);
        
        if (match && match[1]) {
          emailAddress = match[1];
        }
        
        const matchedAlias = aliases.find(alias => 
          alias.sendAsEmail === emailAddress
        );
        
        if (matchedAlias && matchedAlias.sendAsEmail) {
          fromAddress = matchedAlias.displayName ? 
            `${matchedAlias.displayName} <${matchedAlias.sendAsEmail}>` : 
            matchedAlias.sendAsEmail;
        }
      }
    }
    
    const result = await client.sendMessage({
      to: params.to,
      subject: params.subject,
      content: params.body,
      threadId: params.threadId,
      from: fromAddress,
      inReplyTo: params.inReplyTo,
      references: references.length > 0 ? references : undefined
    });
    
    return {
      messageId: result.messageId,
      threadId: result.threadId,
      to: params.to,
      subject: params.subject,
      from: fromAddress
    };
  }
}; 