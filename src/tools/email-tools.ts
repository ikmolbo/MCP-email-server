import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";

export const readEmailTool: Tool = {
  name: "email_read",
  description: "Read an email message and extract its content and metadata",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "The ID of the message to read"
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
      content: email.content,
      attachments: email.attachments?.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType
      }))
    };
  }
};

export const sendEmailTool: Tool = {
  name: "email_send",
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
      content: {
        type: "string",
        description: "Email content"
      },
      from: {
        type: "string",
        description: "Sender email address (optional)"
      }
    },
    required: ["to", "subject", "content"]
  },
  handler: async (client: GmailClientWrapper, params: {
    to: string[];
    subject: string;
    content: string;
    from?: string;
  }) => {
    const result = await client.sendMessage({
      to: params.to,
      subject: params.subject,
      content: params.content,
      from: params.from,
    });

    return {
      messageId: result.messageId,
      threadId: result.threadId,
    };
  }
};

export const sendReplyTool: Tool = {
  name: "email_reply",
  description: "Send a reply to an existing email message",
  inputSchema: {
    type: "object",
    properties: {
      threadId: {
        type: "string",
        description: "Thread ID of the original message"
      },
      inReplyTo: {
        type: "string",
        description: "Message ID of the original message"
      },
      fromAddress: {
        type: "string",
        description: "Address to send the reply from"
      },
      subject: {
        type: "string",
        description: "Reply subject"
      },
      content: {
        type: "string",
        description: "Reply content"
      },
      references: {
        type: "array",
        items: { type: "string" },
        description: "References to previous messages in thread"
      }
    },
    required: ["threadId", "inReplyTo", "fromAddress", "subject", "content"]
  },
  handler: async (client: GmailClientWrapper, params: {
    threadId: string;
    inReplyTo: string;
    fromAddress: string;
    subject: string;
    content: string;
    references?: string[];
  }) => {
    // Get the original message to extract recipients
    const originalEmail = await client.getMessage(params.inReplyTo);
    
    const result = await client.sendMessage({
      to: originalEmail.to,
      subject: params.subject.startsWith('Re:') ? params.subject : `Re: ${params.subject}`,
      content: params.content,
      threadId: params.threadId,
      from: params.fromAddress,
      inReplyTo: params.inReplyTo,
      references: params.references || [params.inReplyTo],
    });

    return {
      messageId: result.messageId,
      threadId: result.threadId,
    };
  }
};

export const listEmailsTool: Tool = {
  name: "email_list",
  description: "List emails with pagination support and filtering options. Supports Gmail categories (Primary, Social, Promotions, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      pageSize: {
        type: "number",
        description: "Number of emails per page (default: 100, max: 500)",
        minimum: 1,
        maximum: 500
      },
      pageToken: {
        type: "string",
        description: "Token for the next page of results"
      },
      labelIds: {
        type: "array",
        items: { type: "string" },
        description: "Filter by label IDs (e.g., INBOX, UNREAD)"
      },
      includeSpamTrash: {
        type: "boolean",
        description: "Include messages from SPAM and TRASH folders"
      },
      query: {
        type: "string",
        description: "Gmail search query (e.g., 'from:example@gmail.com')"
      },
      category: {
        type: "string",
        enum: ["primary", "social", "promotions", "updates", "forums"],
        description: "Filter by Gmail category. Use 'primary' for main inbox emails, excluding other categories."
      }
    }
  },
  handler: async (client: GmailClientWrapper, params: {
    pageSize?: number;
    pageToken?: string;
    labelIds?: string[];
    includeSpamTrash?: boolean;
    query?: string;
    category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  }) => {
    const result = await client.listMessages(params);

    return {
      messages: result.items.map(email => ({
        messageId: email.messageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        labels: email.labels,
        hasAttachments: email.attachments && email.attachments.length > 0
      })),
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate
    };
  }
};

export const emailTools = {
  readEmailTool,
  sendEmailTool,
  sendReplyTool,
  listEmailsTool
}; 