import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";

/**
  * Schema for creating an email draft
 */
const CreateDraftSchema = z.object({
  to: z.array(z.string()).describe("List of email addresses of recipients"),
  subject: z.string().describe("Subiectul email-ului"),
  body: z.string().describe("Conținutul email-ului"),
  cc: z.array(z.string()).optional().describe("Lista destinatarilor în CC"),
  bcc: z.array(z.string()).optional().describe("Lista destinatarilor în BCC"),
  from: z.string().optional().describe("Adresa specifică de la care se trimite email-ul"),
});

/**
 * Schema for getting a draft
 */
const GetDraftSchema = z.object({
  draftId: z.string().describe("ID of the draft to get"),
});

/**
 * Schema for listing drafts
 */
const ListDraftsSchema = z.object({
  maxResults: z.number().optional().default(20).describe("Number of drafts to return"),
  pageToken: z.string().optional().describe("Token for the next page of results"),
  query: z.string().optional().describe("Search filter for drafts"),
});

/**
 * Schema for updating a draft
 */
const UpdateDraftSchema = z.object({
  draftId: z.string().describe("ID of the draft to update"),
  to: z.array(z.string()).describe("List of email addresses of recipients"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body"),
  cc: z.array(z.string()).optional().describe("List of CC recipients"),
  bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
  from: z.string().optional().describe("Specific email address of the sender"),
});

/**
 * Schema for deleting a draft
 */
const DeleteDraftSchema = z.object({
  draftId: z.string().describe("ID of the draft to delete"),
});

/**
 * Schema for sending a draft
 */
const SendDraftSchema = z.object({
  draftId: z.string().describe("ID of the draft to send"),
});

/**
 * Tool for creating a draft
 */
export const createDraftTool: Tool = {
  name: "create_draft",
  description: "Create a new draft for an email",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "List of email addresses of recipients"
      },
      subject: {
        type: "string",
        description: "Email subject"
      },
      body: {
        type: "string",
        description: "Email body"
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
      from: {
        type: "string",
        description: "Specific email address of the sender"
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
    from?: string;
  }) => {
    try {
      const draft = await client.createDraft({
        to: params.to,
        subject: params.subject,
        content: params.body,
        cc: params.cc,
        bcc: params.bcc,
        from: params.from
      });

      return {
        draftId: draft.id,
        messageId: draft.message?.id,
        to: params.to,
        subject: params.subject,
        from: params.from || "Me"
      };
    } catch (error) {
      throw new Error(`Failed to create draft: ${error}`);
    }
  }
};

/**
 * Tool for getting a draft
 */
export const getDraftTool: Tool = {
  name: "get_draft",
  description: "Get details of a specific draft",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID of the draft to get"
      }
    },
    required: ["draftId"]
  },
  handler: async (client: GmailClientWrapper, params: { draftId: string }) => {
    try {
      const draft = await client.getDraft(params.draftId);
      
      return {
        draftId: draft.id,
        messageId: draft.message?.id,
        subject: draft.message?.subject || "",
        to: draft.message?.to || [],
        cc: draft.message?.cc || [],
        content: draft.message?.content || "",
        from: draft.message?.from || "Me"
      };
    } catch (error) {
      throw new Error(`Failed to get draft: ${error}`);
    }
  }
};

/**
 * Tool for listing drafts
 */
export const listDraftsTool: Tool = {
  name: "list_drafts",
  description: "List drafts from the email account",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Number of drafts to return",
        default: 20
      },
      pageToken: {
        type: "string",
        description: "Token for the next page of results"
      },
      query: {
        type: "string",
        description: "Search filter for drafts"
      }
    }
  },
  handler: async (client: GmailClientWrapper, params: {
    maxResults?: number;
    pageToken?: string;
    query?: string;
  }) => {
    try {
      const drafts = await client.listDrafts({
        maxResults: params.maxResults || 20,
        pageToken: params.pageToken,
        query: params.query
      });
      
      return {
        drafts: drafts.drafts.map(draft => ({
          draftId: draft.id,
          messageId: draft.message?.id,
          subject: draft.message?.subject || "[No subject]",
          to: draft.message?.to || [],
          snippet: draft.message?.snippet || ""
        })),
        nextPageToken: drafts.nextPageToken,
        totalResults: drafts.totalResults
      };
    } catch (error) {
      throw new Error(`Failed to list drafts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Tool for updating a draft
 */
export const updateDraftTool: Tool = {
  name: "update_draft",
  description: "Update the content of an existing draft",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID of the draft to update"
      },
      to: {
        type: "array",
        items: { type: "string" },
        description: "List of email addresses of recipients"
      },
      subject: {
        type: "string",
        description: "Email subject"
      },
      body: {
        type: "string",
        description: "Email body"
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
      from: {
        type: "string",
        description: "Specific email address of the sender"
      }
    },
    required: ["draftId", "to", "subject", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    draftId: string;
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    from?: string;
  }) => {
    try {
      const updatedDraft = await client.updateDraft(params.draftId, {
        to: params.to,
        subject: params.subject,
        content: params.body,
        cc: params.cc,
        bcc: params.bcc,
        from: params.from
      });
      
      return {
        draftId: updatedDraft.id,
        messageId: updatedDraft.message?.id,
        to: params.to,
        subject: params.subject,
        from: params.from || "Me"
      };
    } catch (error) {
      throw new Error(`Failed to update draft: ${error}`);
    }
  }
};

/**
 * Tool for deleting a draft
 */
export const deleteDraftTool: Tool = {
  name: "delete_draft",
  description: "Permanently delete a draft",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID of the draft to delete"
      }
    },
    required: ["draftId"]
  },
  handler: async (client: GmailClientWrapper, params: { draftId: string }) => {
    try {
      await client.deleteDraft(params.draftId);
      
      return {
        draftId: params.draftId,
        status: "deleted"
      };
    } catch (error) {
      throw new Error(`Failed to delete draft: ${error}`);
    }
  }
};

/**
 * Tool for sending a draft
 */
export const sendDraftTool: Tool = {
  name: "send_draft",
  description: "Send a draft email",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID of the draft to send"
      }
    },
    required: ["draftId"]
  },
  handler: async (client: GmailClientWrapper, params: { draftId: string }) => {
    try {
      const result = await client.sendDraft(params.draftId);
      
      return {
        draftId: params.draftId,
        messageId: result.messageId,
        threadId: result.threadId,
        status: "sent"
      };
    } catch (error) {
      throw new Error(`Failed to send draft: ${error}`);
    }
  }
}; 