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
  from: z.string().optional().describe("Specific send-as email address to use as sender"),
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
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender"
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
    from?: string;
  }) => {
    // Variabile pentru referințe și adresa expeditorului
    let references: string[] = [];
    let fromAddress: string | undefined = params.from;
    
    // Dacă este un răspuns la un email existent, obținem detaliile acestuia
    if (params.inReplyTo) {
      // Obține detaliile emailului original
      const originalEmail = await client.getMessage(params.inReplyTo);
      
      // Extrage referințele existente pentru threading corect
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
      
      // Determină adresa corectă de expeditor pentru răspuns
      if (!fromAddress) {
        fromAddress = await client.determineReplyFromAddress(originalEmail);
      }
    } else if (!fromAddress) {
      // Pentru email-uri noi (nu răspunsuri), folosim adresa implicită dacă nu s-a specificat una
      const defaultAlias = await client.getDefaultSendAsAlias();
      if (defaultAlias && defaultAlias.sendAsEmail) {
        fromAddress = defaultAlias.displayName ? 
          `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
          defaultAlias.sendAsEmail;
      }
    }
    
    // Filtrăm adresele proprii din destinatari
    const filteredTo = await client.filterOutOwnAddresses(params.to);
    const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
    
    // Trimite mesajul cu parametrii actualizați
    const result = await client.sendMessage({
      to: filteredTo,
      subject: params.subject,
      content: params.body,
      cc: filteredCc,
      threadId: params.threadId,
      from: fromAddress,
      inReplyTo: params.inReplyTo,
      references: references.length > 0 ? references : undefined
    });
    
    return {
      messageId: result.messageId,
      threadId: result.threadId,
      to: filteredTo,
      cc: filteredCc,
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
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender (optional)"
      }
    },
    required: ["messageId", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    body: string;
    additionalRecipients?: string[];
    excludeRecipients?: string[];
    from?: string;
  }) => {
    try {
      // Obține detaliile emailului original
      const originalEmail = await client.getMessage(params.messageId);
      
      // Dacă nu există threadId, nu putem face un răspuns corect
      if (!originalEmail.threadId) {
        throw new Error("Cannot reply to message: no thread ID available");
      }
      
      // Expeditorul original devine destinatarul principal
      const originalSender = originalEmail.from;
      
      // Combinăm toți destinatarii (To + CC din emailul original)
      let allRecipients = [
        ...originalEmail.to, 
        ...(originalEmail.cc || [])
      ];
      
      // Adăugăm orice destinatari suplimentari
      if (params.additionalRecipients && params.additionalRecipients.length > 0) {
        allRecipients = [...allRecipients, ...params.additionalRecipients];
      }
      
      // Determinăm adresa corectă de expeditor (from) pentru răspuns
      let fromAddress = params.from;
      if (!fromAddress) {
        fromAddress = await client.determineReplyFromAddress(originalEmail);
      }
      
      // Filtrăm destinatarii pentru a exclude adresele proprii și cele specificate manual
      // folosind metoda filterOutOwnAddresses oferită de client
      let filteredRecipients = await client.filterOutOwnAddresses(allRecipients);
      
      // Aplicăm și excluderile explicite specificate de utilizator
      if (params.excludeRecipients && params.excludeRecipients.length > 0) {
        const excludeEmails = params.excludeRecipients.map(
          addr => client.extractEmailAddress(addr).toLowerCase()
        );
        
        filteredRecipients = filteredRecipients.filter(recipient => {
          const email = client.extractEmailAddress(recipient).toLowerCase();
          return !excludeEmails.includes(email);
        });
      }
      
      // Expeditorul original merge în To, restul în CC
      const to = [originalSender];
      const cc = filteredRecipients.filter(r => {
        const recipientEmail = client.extractEmailAddress(r).toLowerCase();
        const senderEmail = client.extractEmailAddress(originalSender).toLowerCase();
        return recipientEmail !== senderEmail;
      });
      
      // Filtrăm și lista 'to' pentru a exclude adresele proprii
      const filteredTo = await client.filterOutOwnAddresses(to);
      
      // Extrage referințele existente pentru threading corect
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
      
      // Pregătește subiectul cu prefixul "Re:" dacă nu există deja
      let subject = originalEmail.subject;
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }
      
      // Trimite răspunsul către toți
      const result = await client.sendMessage({
        to: filteredTo,
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
        to: filteredTo,
        cc,
        subject,
        from: fromAddress
      };
    } catch (error) {
      throw new Error(`Failed to reply to all: ${error}`);
    }
  }
};

// Schema definition
const ListSendAsSchema = z.object({});

export const listSendAsAccountsTool: Tool = {
  name: "list_send_as_accounts",
  description: "List all accounts that you can send mail as, including their primary email and any additional aliases",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async (client: GmailClientWrapper, params: {}) => {
    try {
      // Obține toate adresele send-as disponibile
      const aliases = await client.getSendAsAliases();
      
      // Identifică adresa implicită (default)
      const defaultAlias = aliases.find(alias => alias.isDefault === true);
      const defaultEmail = defaultAlias?.sendAsEmail || '';
      
      // Formatează rezultatul pentru afișare
      const formattedAliases = aliases.map(alias => {
        return {
          email: alias.sendAsEmail || '',
          name: alias.displayName || '',
          isDefault: alias.isDefault || false,
          isPrimary: alias.isPrimary || false,
          replyToAddress: alias.replyToAddress || null,
          verificationStatus: alias.verificationStatus || 'unknown'
        };
      });
      
      return {
        accounts: formattedAliases,
        defaultAccount: defaultEmail,
        count: aliases.length
      };
    } catch (error) {
      throw new Error(`Failed to list send-as accounts: ${error}`);
    }
  }
};

// Schema definition for Forward Email
const ForwardEmailSchema = z.object({
  messageId: z.string().describe("ID of the message to forward"),
  to: z.array(z.string()).describe("Recipients to forward the email to"),
  additionalContent: z.string().optional().describe("Additional content to add before the forwarded message"),
  cc: z.array(z.string()).optional().describe("CC recipients"),
  from: z.string().optional().describe("Specific send-as email address to use as sender")
});

export const forwardEmailTool: Tool = {
  name: "forward_email",
  description: "Forward an email to other recipients",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to forward"
      },
      to: {
        type: "array",
        items: { type: "string" },
        description: "Recipients to forward the email to"
      },
      additionalContent: {
        type: "string",
        description: "Additional content to add before the forwarded message"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients"
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender"
      }
    },
    required: ["messageId", "to"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    to: string[];
    additionalContent?: string;
    cc?: string[];
    from?: string;
  }) => {
    try {
      // Obține detaliile emailului original
      const originalEmail = await client.getMessage(params.messageId);
      
      // Pregătește subiectul cu prefixul "Fwd:" dacă nu există deja
      let subject = originalEmail.subject;
      if (!subject.toLowerCase().startsWith('fwd:')) {
        subject = `Fwd: ${subject}`;
      }
      
      // Determină adresa corectă de expeditor
      let fromAddress = params.from;
      if (!fromAddress) {
        // Pentru forward, în mod implicit folosim adresa default
        const defaultAlias = await client.getDefaultSendAsAlias();
        if (defaultAlias && defaultAlias.sendAsEmail) {
          fromAddress = defaultAlias.displayName ? 
            `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
            defaultAlias.sendAsEmail;
        }
      }
      
      // Pregătește conținutul email-ului forwarded
      let content = '';
      
      // Adaugă conținut suplimentar dacă există
      if (params.additionalContent) {
        content += params.additionalContent + '\n\n';
      }
      
      // Adaugă headerele email-ului original
      content += '---------- Forwarded message ---------\n';
      content += `From: ${originalEmail.from}\n`;
      content += `Date: ${originalEmail.timestamp || 'Unknown'}\n`;
      content += `Subject: ${originalEmail.subject}\n`;
      content += `To: ${originalEmail.to.join(', ')}\n`;
      
      // Adaugă headerul CC dacă există
      if (originalEmail.cc && originalEmail.cc.length > 0) {
        content += `Cc: ${originalEmail.cc.join(', ')}\n`;
      }
      
      content += '\n';
      
      // Adaugă conținutul email-ului original
      content += originalEmail.content || '';
      
      // Filtrăm adresele proprii din destinatari
      const filteredTo = await client.filterOutOwnAddresses(params.to);
      const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
      
      // Trimite email-ul forwarded
      const result = await client.sendMessage({
        to: filteredTo,
        cc: filteredCc,
        subject,
        content,
        // Adăugăm threadId de la emailul original pentru a menține conversația
        threadId: originalEmail.threadId,
        from: fromAddress,
      });
      
      return {
        messageId: result.messageId,
        threadId: result.threadId,
        to: filteredTo,
        cc: filteredCc,
        subject,
        from: fromAddress
      };
    } catch (error) {
      throw new Error(`Failed to forward email: ${error}`);
    }
  }
}; 