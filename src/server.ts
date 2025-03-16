import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { OAuth2Client } from "google-auth-library";
import { GmailClientWrapper } from "./client-wrapper.js";
import { createToolHandler, tools } from "./tool-handler.js";
import { createPromptHandler } from "./prompt-handler.js";
import { VERSION } from "./version.js";

export interface ServerConfig {
  auth: OAuth2Client;
}

export async function startServer(config: ServerConfig) {
  const server = new Server(
    {
      name: "MCP Email Server",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      },
    }
  );

  const client = new GmailClientWrapper(config.auth);
  
  const toolHandler = createToolHandler(client);
  server.setRequestHandler(CallToolRequestSchema, toolHandler);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  
  const promptHandlers = createPromptHandler();
  server.setRequestHandler(ListPromptsRequestSchema, promptHandlers.listPrompts);
  server.setRequestHandler(GetPromptRequestSchema, promptHandlers.getPrompt);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
} 