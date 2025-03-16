#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import open from 'open';
import os from 'os';
import dotenv from 'dotenv';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { 
  createEmailMessage, 
  extractEmailContent, 
  getAttachments, 
  getDateQuery,
  GmailMessagePart 
} from './utils.js';
import { authenticate as googleAuthenticate } from '@google-cloud/local-auth';
import { dirname } from 'path';
import { startServer } from './server.js';

// Initialize environment
dotenv.config();
console.error("Environment loaded");

// Configuration paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = path.join(os.homedir(), '.email-mcp');
const OAUTH_PATH = process.env.GMAIL_OAUTH_PATH || path.join(CONFIG_DIR, 'gcp-oauth.keys.json');
const CREDENTIALS_PATH = process.env.GMAIL_CREDENTIALS_PATH || path.join(CONFIG_DIR, 'credentials.json');

// OAuth2 client
let oauth2Client: OAuth2Client;

// Schema definitions
const SendEmailSchema = z.object({
  to: z.array(z.string()).describe("List of recipient email addresses"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body content"),
  cc: z.array(z.string()).optional().describe("List of CC recipients"),
  bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
  inReplyTo: z.string().optional().describe("Message ID to reply to"),
  threadId: z.string().optional().describe("Thread ID to add the message to"),
});

const GetRecentEmailsSchema = z.object({
  hours: z.number().default(24).describe("Number of hours to look back (default: 24)"),
  maxResults: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
  query: z.string().optional().describe("Additional Gmail search query (e.g., 'from:example@gmail.com')"),
});

const ReadEmailSchema = z.object({
  messageId: z.string().describe("ID of the email message to retrieve"),
});

const SearchEmailsSchema = z.object({
  query: z.string().describe("Gmail search query (e.g., 'from:example@gmail.com')"),
  maxResults: z.number().optional().default(10).describe("Maximum number of results to return"),
});

// Load OAuth credentials
async function loadCredentials() {
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Check for OAuth keys in current directory first, then in config directory
    const localOAuthPath = path.join(process.cwd(), 'gcp-oauth.keys.json');
    
    if (fs.existsSync(localOAuthPath)) {
      // If found in current directory, copy to config directory
      fs.copyFileSync(localOAuthPath, OAUTH_PATH);
      console.error('OAuth keys found in current directory, copied to global config.');
    }

    if (!fs.existsSync(OAUTH_PATH)) {
      console.error('Error: OAuth keys file not found. Please place gcp-oauth.keys.json in current directory or', CONFIG_DIR);
      process.exit(1);
    }

    const keysContent = JSON.parse(fs.readFileSync(OAUTH_PATH, 'utf8'));
    const keys = keysContent.installed || keysContent.web;

    if (!keys) {
      console.error('Error: Invalid OAuth keys file format. File should contain either "installed" or "web" credentials.');
      process.exit(1);
    }

    oauth2Client = new OAuth2Client(
      keys.client_id,
      keys.client_secret,
      'http://localhost:3000/oauth2callback'
    );

    if (fs.existsSync(CREDENTIALS_PATH)) {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      oauth2Client.setCredentials(credentials);
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
    process.exit(1);
  }
}

// Add this function after loadCredentials()
async function getReplyToAddress(gmail: any, messageId: string): Promise<string | undefined> {
  try {
    // First get the original message to find the To: address
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['To'],
    });

    const toHeader = message.data.payload?.headers?.find((h: any) => h.name === 'To');
    if (!toHeader?.value) return undefined;

    // Extract email address from To: header
    const match = toHeader.value.match(/<([^>]+)>/) || [null, toHeader.value.trim()];
    const originalToAddress = match[1];

    // Get list of send-as aliases
    const sendAsResponse = await gmail.users.settings.sendAs.list({
      userId: 'me',
    });

    // Find the matching send-as alias
    const sendAsAlias = sendAsResponse.data.sendAs?.find(
      (alias: any) => alias.sendAsEmail === originalToAddress
    );

    if (sendAsAlias) {
      return `${sendAsAlias.displayName} <${sendAsAlias.sendAsEmail}>`;
    }

    return undefined;
  } catch (error) {
    console.error('Error getting reply-to address:', error);
    return undefined;
  }
}

// Authenticate with Google
async function authenticate() {
  const server = http.createServer();
  server.listen(3000);

  return new Promise<void>((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.modify'],
    });

    console.error('Please visit this URL to authenticate:', authUrl);
    open(authUrl);

    server.on('request', async (req, res) => {
      if (!req.url?.startsWith('/oauth2callback')) return;

      const url = new URL(req.url, 'http://localhost:3000');
      const code = url.searchParams.get('code');

      if (!code) {
        res.writeHead(400);
        res.end('No code provided');
        reject(new Error('No code provided'));
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(tokens));

        res.writeHead(200);
        res.end('Authentication successful! You can close this window.');
        server.close();
        resolve();
      } catch (error) {
        res.writeHead(500);
        res.end('Authentication failed');
        reject(error);
      }
    });
  });
}

// Main function
async function main() {
  await loadCredentials();

  if (process.argv[2] === 'auth') {
    await authenticate();
    console.error('Authentication completed successfully');
    process.exit(0);
  }

  // Check if we need to authenticate
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('No credentials found. Starting authentication...');
    await authenticate();
  }

  // Initialize Gmail API
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Create MCP server
  const server = new Server({
    name: "email-server",
    version: "0.1.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Set up error handling
  server.onerror = (error) => {
    console.error("MCP Server Error:", error);
  };

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  // Set up tool handlers
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      console.error("Handling ListToolsRequest");
      return {
        tools: [
          {
            name: "send_email",
            description: "Send an email",
            inputSchema: zodToJsonSchema(SendEmailSchema),
          },
          {
            name: "get_recent_emails",
            description: "Get emails from the last X hours",
            inputSchema: zodToJsonSchema(GetRecentEmailsSchema),
          },
          {
            name: "read_email",
            description: "Read a specific email by ID",
            inputSchema: zodToJsonSchema(ReadEmailSchema),
          },
          {
            name: "search_emails",
            description: "Search for emails using Gmail query syntax",
            inputSchema: zodToJsonSchema(SearchEmailsSchema),
          }
        ]
      };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      console.error("Handling CallToolRequest:", JSON.stringify(request.params));
      
      try {
        switch (request.params.name) {
          case "send_email": {
            const args = SendEmailSchema.parse(request.params.arguments);
            console.error(`Sending email to: ${args.to.join(', ')}`);
            
            // If this is a reply, get the original message details
            let references: string[] = [];
            let fromAddress: string | undefined;
            
            if (args.inReplyTo) {
              // Get original message for References header
              const originalMessage = await gmail.users.messages.get({
                userId: 'me',
                id: args.inReplyTo,
                format: 'metadata',
                metadataHeaders: ['References', 'Message-ID'],
              });
              
              const headers = originalMessage.data.payload?.headers || [];
              const existingRefs = headers.find(h => h.name === 'References')?.value;
              const messageId = headers.find(h => h.name === 'Message-ID')?.value;
              
              if (existingRefs) {
                references = existingRefs.split(/\s+/);
              }
              if (messageId) {
                references.push(messageId.replace(/[<>]/g, ''));
              }

              // Get the correct reply-from address
              fromAddress = await getReplyToAddress(gmail, args.inReplyTo);
            }
            
            const message = createEmailMessage({
              ...args,
              references: references.length > 0 ? references : undefined,
              from: fromAddress,
            });
            
            const encodedMessage = Buffer.from(message).toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');
            
            const response = await gmail.users.messages.send({
              userId: 'me',
              requestBody: {
                raw: encodedMessage,
                threadId: args.threadId,
              },
            });
            
            console.error("Email sent successfully:", response.data.id);
            
            return {
              content: [{
                type: "text",
                text: `Email sent successfully!\n\nTo: ${args.to.join(', ')}\nSubject: ${args.subject}\nMessage ID: ${response.data.id}${args.threadId ? '\nThread ID: ' + args.threadId : ''}${fromAddress ? '\nSent from: ' + fromAddress : ''}`
              }]
            };
          }
          
          case "get_recent_emails": {
            const args = GetRecentEmailsSchema.parse(request.params.arguments);
            console.error(`Getting emails from the last ${args.hours} hours`);
            
            const dateQuery = `after:${getDateQuery(args.hours)}`;
            const fullQuery = args.query ? `${dateQuery} ${args.query}` : dateQuery;
            
            const response = await gmail.users.messages.list({
              userId: 'me',
              q: fullQuery,
              maxResults: args.maxResults,
            });
            
            const messages = response.data.messages || [];
            console.error(`Found ${messages.length} emails`);
            
            if (messages.length === 0) {
              return {
                content: [{
                  type: "text",
                  text: `No emails found in the last ${args.hours} hours.`
                }]
              };
            }
            
            const results = await Promise.all(
              messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                  userId: 'me',
                  id: msg.id!,
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From', 'To', 'Date'],
                });
                
                const headers = detail.data.payload?.headers || [];
                return {
                  id: msg.id,
                  subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
                  from: headers.find(h => h.name === 'From')?.value || '',
                  to: headers.find(h => h.name === 'To')?.value || '',
                  date: headers.find(h => h.name === 'Date')?.value || '',
                  snippet: detail.data.snippet || '',
                };
              })
            );
            
            let responseText = `Found ${results.length} emails from the last ${args.hours} hours:\n\n`;
            
            results.forEach((email, index) => {
              responseText += `${index + 1}. ID: ${email.id}\n`;
              responseText += `   Subject: ${email.subject}\n`;
              responseText += `   From: ${email.from}\n`;
              responseText += `   To: ${email.to}\n`;
              responseText += `   Date: ${email.date}\n`;
              responseText += `   Snippet: ${email.snippet}\n\n`;
            });
            
            return {
              content: [{
                type: "text",
                text: responseText
              }]
            };
          }
          
          case "read_email": {
            const args = ReadEmailSchema.parse(request.params.arguments);
            console.error(`Reading email: ${args.messageId}`);
            
            const response = await gmail.users.messages.get({
              userId: 'me',
              id: args.messageId,
              format: 'full',
            });
            
            const headers = response.data.payload?.headers || [];
            const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
            const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
            const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
            const cc = headers.find(h => h.name?.toLowerCase() === 'cc')?.value || '';
            const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
            const messageId = headers.find(h => h.name?.toLowerCase() === 'message-id')?.value || '';
            const threadId = response.data.threadId || '';
            
            // Extract email content
            const { text, html } = extractEmailContent(response.data.payload as GmailMessagePart || {});
            
            // Use plain text content if available, otherwise use HTML
            let body = text || html || '';
            
            // Add note if only HTML is available
            const contentTypeNote = !text && html ?
              '[Note: This email is HTML-formatted. Plain text version not available.]\n\n' : '';
            
            // Get attachment information
            const attachments = getAttachments(response.data.payload as GmailMessagePart || {});
            
            // Add attachment info to output if any are present
            const attachmentInfo = attachments.length > 0 ?
              `\n\nAttachments (${attachments.length}):\n` +
              attachments.map(a => `- ${a.filename} (${a.mimeType}, ${Math.round(a.size/1024)} KB)`).join('\n') : '';
            
            return {
              content: [{
                type: "text",
                text: `Subject: ${subject}\nFrom: ${from}\nTo: ${to}${cc ? `\nCC: ${cc}` : ''}\nDate: ${date}\nMessage-ID: ${messageId}\nThread ID: ${threadId}\n\n${contentTypeNote}${body}${attachmentInfo}`
              }]
            };
          }
          
          case "search_emails": {
            const args = SearchEmailsSchema.parse(request.params.arguments);
            console.error(`Searching emails with query: ${args.query}`);
            
            const response = await gmail.users.messages.list({
              userId: 'me',
              q: args.query,
              maxResults: args.maxResults,
            });
            
            const messages = response.data.messages || [];
            console.error(`Found ${messages.length} emails`);
            
            if (messages.length === 0) {
              return {
                content: [{
                  type: "text",
                  text: `No emails found matching query: ${args.query}`
                }]
              };
            }
            
            const results = await Promise.all(
              messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                  userId: 'me',
                  id: msg.id!,
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From', 'Date'],
                });
                
                const headers = detail.data.payload?.headers || [];
                return {
                  id: msg.id,
                  subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
                  from: headers.find(h => h.name === 'From')?.value || '',
                  date: headers.find(h => h.name === 'Date')?.value || '',
                  snippet: detail.data.snippet || '',
                };
              })
            );
            
            let responseText = `Found ${results.length} emails matching query "${args.query}":\n\n`;
            
            results.forEach((email, index) => {
              responseText += `${index + 1}. ID: ${email.id}\n`;
              responseText += `   Subject: ${email.subject}\n`;
              responseText += `   From: ${email.from}\n`;
              responseText += `   Date: ${email.date}\n`;
              responseText += `   Snippet: ${email.snippet}\n\n`;
            });
            
            return {
              content: [{
                type: "text",
                text: responseText
              }]
            };
          }
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error("ERROR during Gmail API call:", error);
        
        return {
          content: [{
            type: "text",
            text: `Gmail API error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Start the server
  console.error("Starting Email MCP server");
  
  try {
    const transport = new StdioServerTransport();
    console.error("StdioServerTransport created");
    
    await server.connect(transport);
    console.error("Server connected to transport");
    
    console.error("Email MCP server running on stdio");
  } catch (error) {
    console.error("ERROR starting server:", error);
    throw error;
  }
}

// Main execution
main().catch(error => {
  console.error("Server runtime error:", error);
  process.exit(1);
}); 