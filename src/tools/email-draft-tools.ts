import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";

/**
 * Schema pentru crearea unei ciorne de email
 */
const CreateDraftSchema = z.object({
  to: z.array(z.string()).describe("Lista adreselor de email ale destinatarilor"),
  subject: z.string().describe("Subiectul email-ului"),
  body: z.string().describe("Conținutul email-ului"),
  cc: z.array(z.string()).optional().describe("Lista destinatarilor în CC"),
  bcc: z.array(z.string()).optional().describe("Lista destinatarilor în BCC"),
  from: z.string().optional().describe("Adresa specifică de la care se trimite email-ul"),
});

/**
 * Schema pentru obținerea unei ciorne
 */
const GetDraftSchema = z.object({
  draftId: z.string().describe("ID-ul ciornei care trebuie obținută"),
});

/**
 * Schema pentru listarea ciornelor
 */
const ListDraftsSchema = z.object({
  maxResults: z.number().optional().default(20).describe("Numărul maxim de ciorne de returnat"),
  pageToken: z.string().optional().describe("Token-ul pentru pagina următoare de rezultate"),
  query: z.string().optional().describe("Filtru de căutare pentru ciorne"),
});

/**
 * Schema pentru actualizarea unei ciorne
 */
const UpdateDraftSchema = z.object({
  draftId: z.string().describe("ID-ul ciornei care trebuie actualizată"),
  to: z.array(z.string()).describe("Lista adreselor de email ale destinatarilor"),
  subject: z.string().describe("Subiectul email-ului"),
  body: z.string().describe("Conținutul email-ului"),
  cc: z.array(z.string()).optional().describe("Lista destinatarilor în CC"),
  bcc: z.array(z.string()).optional().describe("Lista destinatarilor în BCC"),
  from: z.string().optional().describe("Adresa specifică de la care se trimite email-ul"),
});

/**
 * Schema pentru ștergerea unei ciorne
 */
const DeleteDraftSchema = z.object({
  draftId: z.string().describe("ID-ul ciornei care trebuie ștearsă"),
});

/**
 * Schema pentru trimiterea unei ciorne
 */
const SendDraftSchema = z.object({
  draftId: z.string().describe("ID-ul ciornei care trebuie trimisă"),
});

/**
 * Tool pentru crearea unei ciorne
 */
export const createDraftTool: Tool = {
  name: "create_draft",
  description: "Creează o ciornă nouă pentru un email",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "Lista adreselor de email ale destinatarilor"
      },
      subject: {
        type: "string",
        description: "Subiectul email-ului"
      },
      body: {
        type: "string",
        description: "Conținutul email-ului"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "Lista destinatarilor în CC"
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "Lista destinatarilor în BCC"
      },
      from: {
        type: "string",
        description: "Adresa specifică de la care se trimite email-ul"
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
 * Tool pentru obținerea unei ciorne
 */
export const getDraftTool: Tool = {
  name: "get_draft",
  description: "Obține detaliile unei ciorne specifice",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID-ul ciornei care trebuie obținută"
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
 * Tool pentru listarea ciornelor
 */
export const listDraftsTool: Tool = {
  name: "list_drafts",
  description: "Listează ciornele din contul de email",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Numărul maxim de ciorne de returnat",
        default: 20
      },
      pageToken: {
        type: "string",
        description: "Token-ul pentru pagina următoare de rezultate"
      },
      query: {
        type: "string",
        description: "Filtru de căutare pentru ciorne"
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
 * Tool pentru actualizarea unei ciorne
 */
export const updateDraftTool: Tool = {
  name: "update_draft",
  description: "Actualizează conținutul unei ciorne existente",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID-ul ciornei care trebuie actualizată"
      },
      to: {
        type: "array",
        items: { type: "string" },
        description: "Lista adreselor de email ale destinatarilor"
      },
      subject: {
        type: "string",
        description: "Subiectul email-ului"
      },
      body: {
        type: "string",
        description: "Conținutul email-ului"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "Lista destinatarilor în CC"
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "Lista destinatarilor în BCC"
      },
      from: {
        type: "string",
        description: "Adresa specifică de la care se trimite email-ul"
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
 * Tool pentru ștergerea unei ciorne
 */
export const deleteDraftTool: Tool = {
  name: "delete_draft",
  description: "Șterge permanent o ciornă",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID-ul ciornei care trebuie ștearsă"
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
 * Tool pentru trimiterea unei ciorne
 */
export const sendDraftTool: Tool = {
  name: "send_draft",
  description: "Trimite un email salvat ca ciornă",
  inputSchema: {
    type: "object",
    properties: {
      draftId: {
        type: "string",
        description: "ID-ul ciornei care trebuie trimisă"
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