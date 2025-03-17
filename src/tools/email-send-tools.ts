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
      cc: params.cc,
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

// Schema definition for Reply All
const ReplyAllEmailSchema = z.object({
  messageId: z.string().describe("ID of the message to reply to"),
  body: z.string().describe("Email body content"),
  additionalRecipients: z.array(z.string()).optional().describe("Additional recipients to include in the reply"),
  excludeRecipients: z.array(z.string()).optional().describe("Recipients to exclude from the reply"),
});

// Helper function to extract email from address format like "Name <email@example.com>"
function extractEmail(address: string): string {
  const match = address.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : address.toLowerCase();
}

// Helper function to normalize all email addresses (convert to lowercase and extract email part only)
function normalizeEmailAddresses(addresses: string[]): string[] {
  return addresses.map(addr => extractEmail(addr));
}

export const replyAllEmailTool: Tool = {
  name: "reply_all_email",
  description: "Reply to an email and include all original recipients",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to reply to"
      },
      body: {
        type: "string",
        description: "Email body content"
      },
      additionalRecipients: {
        type: "array",
        items: { type: "string" },
        description: "Additional recipients to include in the reply"
      },
      excludeRecipients: {
        type: "array",
        items: { type: "string" },
        description: "Recipients to exclude from the reply"
      }
    },
    required: ["messageId", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    body: string;
    additionalRecipients?: string[];
    excludeRecipients?: string[];
  }) => {
    try {
      // Get original message details
      const originalEmail = await client.getMessage(params.messageId);
      
      // If there's no threadId, we can't do a proper reply
      if (!originalEmail.threadId) {
        throw new Error("Cannot reply to message: no thread ID available");
      }
      
      // Extract the original sender to use as primary recipient
      const originalSender = originalEmail.from;
      
      // Get original CC recipients from headers
      const ccHeader = originalEmail.headers.find(h => h.name?.toLowerCase() === 'cc');
      let ccRecipients: string[] = [];
      if (ccHeader && ccHeader.value) {
        ccRecipients = ccHeader.value.split(/,\s*/).filter(Boolean);
      }
      
      // Combine all recipients (original To + CC)
      let allRecipients = [...originalEmail.to, ...ccRecipients];
      
      // Add any additional recipients
      if (params.additionalRecipients && params.additionalRecipients.length > 0) {
        allRecipients = [...allRecipients, ...params.additionalRecipients];
      }
      
      // Get send-as aliases to find correct reply-from address and to avoid self-reply
      const aliases = await client.getSendAsAliases();
      let fromAddress: string | undefined;
      let myEmails: string[] = [];
      
      // Extract own email addresses from aliases
      aliases.forEach(alias => {
        if (alias.sendAsEmail) {
          myEmails.push(alias.sendAsEmail.toLowerCase());
          
          // Find the right address to send from based on original To
          if (originalEmail.to.some(to => {
            const toEmail = extractEmail(to);
            return toEmail === alias.sendAsEmail?.toLowerCase();
          })) {
            fromAddress = alias.displayName ? 
              `${alias.displayName} <${alias.sendAsEmail}>` : 
              alias.sendAsEmail;
          }
        }
      });
      
      // Use primary send-as if no match found
      if (!fromAddress && aliases.length > 0 && aliases[0].sendAsEmail) {
        fromAddress = aliases[0].displayName ? 
          `${aliases[0].displayName} <${aliases[0].sendAsEmail}>` : 
          aliases[0].sendAsEmail;
      }
      
      // Normalize email addresses for comparison
      const normalizedMyEmails = myEmails.map(email => email.toLowerCase());
      const normalizedExcludeList = params.excludeRecipients ? 
        normalizeEmailAddresses(params.excludeRecipients) : [];
      
      // Filter out own email addresses and excluded recipients
      const filteredRecipients = allRecipients.filter(recipient => {
        const email = extractEmail(recipient);
        
        // Exclude if it's our own email or explicitly excluded
        return !normalizedMyEmails.includes(email) && 
               !normalizedExcludeList.includes(email);
      });
      
      // Split recipients into To and CC
      // Original sender goes to To, all others go to CC
      const to = [originalSender];
      const cc = filteredRecipients.filter(r => {
        // Don't include original sender in CC
        return extractEmail(r) !== extractEmail(originalSender);
      });
      
      // Extract any existing references
      let references: string[] = [];
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
      
      // Prepare subject with "Re:" prefix if needed
      let subject = originalEmail.subject;
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }
      
      // Send the reply to all
      const result = await client.sendMessage({
        to,
        cc,
        subject,
        content: params.body,
        threadId: originalEmail.threadId,
        from: fromAddress,
        inReplyTo: params.messageId,
        references: references.length > 0 ? references : undefined
      });
      
      return {
        messageId: result.messageId,
        threadId: result.threadId,
        to,
        cc,
        subject,
        from: fromAddress
      };
    } catch (error) {
      throw new Error(`Failed to reply to all: ${error}`);
    }
  }
}; 