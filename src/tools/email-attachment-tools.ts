import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import * as fs from 'fs';
import * as path from 'path';

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
  attachmentId: z.string().describe("ID-ul atașamentului (opțional dacă mesajul are un singur atașament)"),
  targetPath: z.string().describe("Calea unde va fi salvat atașamentul"),
});

/**
 * Funcție pentru a scrie un fișier pe disc
 */
async function writeFileToDisk(filePath: string, content: string, contentType: string): Promise<boolean> {
  try {
    // Asigurăm-ne că directorul există
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Decodificăm conținutul Base64 și îl scriem în fișier
    const buffer = Buffer.from(content, 'base64');
    
    // Scriem fișierul
    fs.writeFileSync(filePath, buffer);
    
    console.error(`Successfully wrote file to ${filePath} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`Error writing file to disk: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

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
      
      // Adăugăm un log de debug pentru a vedea attachment IDs
      console.error(`Attachments found for message ${params.messageId}: ${attachments.length}`);
      for (const att of attachments) {
        console.error(`Attachment: ${att.filename}, ID: ${att.id}, Size: ${att.size}, Type: ${att.mimeType}`);
      }
      
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
      console.error(`List attachments error details: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to list attachments: ${error instanceof Error ? error.message : String(error)}`);
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
        description: "ID-ul atașamentului (opțional dacă mesajul are un singur atașament)"
      },
      targetPath: {
        type: "string",
        description: "Calea unde va fi salvat atașamentul"
      }
    },
    required: ["messageId", "targetPath"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    attachmentId?: string;
    targetPath: string;
  }) => {
    try {
      // Listăm mai întâi atașamentele pentru debugging
      const allAttachments = await client.listAttachments(params.messageId);
      console.error(`Available attachments for message ${params.messageId}: ${allAttachments.length}`);
      
      let attachmentId = params.attachmentId;
      
      // Dacă nu avem un ID de atașament și există doar un atașament, îl folosim automat pe acela
      if (!attachmentId && allAttachments.length === 1) {
        attachmentId = allAttachments[0].id;
        console.error(`No attachment ID provided, but only one attachment found. Using ID: ${attachmentId}`);
      } 
      // Dacă nu avem ID și există mai multe atașamente, folosim primul
      else if (!attachmentId && allAttachments.length > 1) {
        attachmentId = allAttachments[0].id;
        console.error(`No attachment ID provided, but multiple attachments found. Using first one with ID: ${attachmentId}`);
      }
      // Dacă nu avem ID și nu există atașamente, aruncăm o eroare
      else if (!attachmentId && allAttachments.length === 0) {
        throw new Error('No attachments found in this message');
      }
      
      console.error(`Target attachment ID: ${attachmentId}`);
      
      // Verificăm dacă ID-ul specificat (fie direct, fie selectat automat) există în lista de atașamente
      const attachmentExists = allAttachments.some(att => att.id === attachmentId);
      if (!attachmentExists) {
        console.error(`Warning: Specified attachment ID ${attachmentId} not found in attachment list. Available IDs: ${allAttachments.map(a => a.id).join(', ')}`);
      }
      
      // Obținem atașamentul
      const attachment = await client.getAttachment(params.messageId, attachmentId!);
      console.error(`Retrieved attachment: ${attachment.filename}, Size: ${attachment.size} bytes, Type: ${attachment.mimeType}`);
      
      // Verificăm dacă avem date în atașament
      if (!attachment.data) {
        throw new Error('Attachment data is empty');
      }
      
      // Construim calea completă a fișierului
      const filePath = params.targetPath;
      
      // Scriem fișierul pe disc
      const writeSuccess = await writeFileToDisk(
        filePath, 
        attachment.data, 
        attachment.mimeType
      );
      
      if (!writeSuccess) {
        throw new Error(`Failed to write file to disk at ${filePath}`);
      }
      
      // Verificăm dacă fișierul există după scriere
      if (!fs.existsSync(filePath)) {
        throw new Error(`File was not created at ${filePath}`);
      }
      
      // Verificăm dimensiunea fișierului
      const stats = fs.statSync(filePath);
      console.error(`File size on disk: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error(`File was created but has zero bytes: ${filePath}`);
      }
      
      // Returnăm rezultatul operațiunii
      return {
        messageId: params.messageId,
        attachmentId: attachmentId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        targetPath: filePath,
        actualFileSize: stats.size,
        success: true,
        message: `Atașamentul "${attachment.filename}" (${stats.size} bytes) a fost salvat cu succes la "${filePath}".`
      };
    } catch (error) {
      console.error(`Save attachment error details: ${error instanceof Error ? error.message : String(error)}`);
      // Creăm un mesaj de eroare mai detaliat
      throw new Error(`Failed to save attachment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 