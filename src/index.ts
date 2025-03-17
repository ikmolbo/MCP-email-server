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
  GmailMessagePart,
  getTodayQuery,
  getYesterdayQuery,
  getTodayDateQuery,
  getTomorrowDateQuery,
  getYesterdayDateQuery,
  ensureCorrectUnreadSyntax,
  formatTimestamp
} from './utils.js';
import { authenticate as googleAuthenticate } from '@google-cloud/local-auth';
import { dirname } from 'path';
import { startServer } from './server.js';
import { GmailClientWrapper, EmailData } from './client-wrapper.js';
import { createToolHandler, tools } from './tool-handler.js';

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
  hours: z.number().optional().default(24).describe("Number of hours to look back (default: 24, can be omitted when using date filters in query)"),
  maxResults: z.number().default(25).describe("Maximum number of results to return (default: 25)"),
  query: z.string().optional().describe("Additional Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"),
  pageToken: z.string().optional().describe("Token for the next page of results"),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional()
    .describe("Filter by Gmail category (primary, social, promotions, updates, forums)"),
  timeFilter: z.enum(['today', 'yesterday', 'last24h']).optional()
    .describe("Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)"),
  autoFetchAll: z.boolean().optional().default(false)
    .describe("Automatically fetch all results (up to 100 items) without requiring pagination")
});

const ReadEmailSchema = z.object({
  messageId: z.string().describe("ID of the email message to retrieve"),
});

const SearchEmailsSchema = z.object({
  query: z.string().describe("Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"),
  maxResults: z.number().optional().default(25).describe("Maximum number of results to return (default: 25)"),
  pageToken: z.string().optional().describe("Token for the next page of results"),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional()
    .describe("Filter by Gmail category (primary, social, promotions, updates, forums)"),
  timeFilter: z.enum(['today', 'yesterday', 'last24h']).optional()
    .describe("Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)"),
  autoFetchAll: z.boolean().optional().default(false)
    .describe("Automatically fetch all results (up to 100 items) without requiring pagination")
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

  // Create Gmail client wrapper
  const gmailClient = new GmailClientWrapper(oauth2Client);
  
  // Create tool handler that handles all tools including label tools
  const toolHandler = createToolHandler(gmailClient);

  // Set up tool handlers
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      console.error("Handling ListToolsRequest");
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    }
  );

  // Use the generic tool handler for all tool requests including label tools
  server.setRequestHandler(CallToolRequestSchema, toolHandler);

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