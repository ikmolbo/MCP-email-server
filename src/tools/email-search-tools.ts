import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { 
  getTodayQuery, 
  getYesterdayQuery, 
  getTodayDateQuery, 
  getYesterdayDateQuery, 
  getDateQuery,
  ensureCorrectUnreadSyntax
} from "../utils.js";
import { 
  timeZoneOffset, 
  formatTimestampWithOffset, 
  transformDateStringToLocalUnix, 
  getLocalMidnightUnixRange 
} from "../timezone-utils.js";

/**
 * Replaces "after:YYYY/MM/DD" with "after:<unix_timestamp>", likewise for "before:YYYY/MM/DD".
 * Example: "after:2025/03/19 label:unread" -> "after:1742680800 label:unread"
 */
export function transformDateBasedOperators(originalQuery: string): string {
  if (!originalQuery) return originalQuery;
  
  let q = originalQuery;

  // Regex that looks for after: or before: followed by "YYYY/MM/DD"
  const re = /\b(after|before):(\d{4}\/\d{1,2}\/\d{1,2})\b/g;

  q = q.replace(re, (match, op, dateStr) => {
    const ts = transformDateStringToLocalUnix(dateStr); 
    return `${op}:${ts}`;
  });

  return q;
}

// Schema definitions
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

export const searchEmailsTool: Tool = {
  name: "search_emails",
  description: "Search for emails using Gmail query syntax with support for categories and time filters",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (default: 25)"
      },
      pageToken: {
        type: "string",
        description: "Token for the next page of results"
      },
      category: {
        type: "string",
        enum: ["primary", "social", "promotions", "updates", "forums"],
        description: "Filter by Gmail category (primary, social, promotions, updates, forums)"
      },
      timeFilter: {
        type: "string",
        enum: ["today", "yesterday", "last24h"],
        description: "Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)"
      },
      autoFetchAll: {
        type: "boolean",
        description: "Automatically fetch all results (up to 100 items) without requiring pagination"
      }
    },
    required: ["query"]
  },
  handler: async (client: GmailClientWrapper, params: {
    query: string;
    maxResults?: number;
    pageToken?: string;
    category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
    timeFilter?: 'today' | 'yesterday' | 'last24h';
    autoFetchAll?: boolean;
  }) => {
    // Start with user provided query and transform any date-based operators
    let userQuery = params.query || '';
    
    // Apply correct unread syntax
    userQuery = ensureCorrectUnreadSyntax(userQuery);
    
    // Transform date-based operators to Unix timestamps
    userQuery = transformDateBasedOperators(userQuery);
    
    // Start with the transformed user query
    let finalQuery = userQuery;
    
    // Add time filter if specified (will override any existing date filters)
    if (params.timeFilter) {
      if (params.timeFilter === 'today') {
        // Today = current calendar date (00:00 to 23:59)
        const [startUnix, endUnix] = getLocalMidnightUnixRange(0);
        finalQuery = `${userQuery} after:${startUnix} before:${endUnix}`.trim();
      } 
      else if (params.timeFilter === 'yesterday') {
        // Yesterday = previous calendar date (00:00 to 23:59)
        const [startUnix, endUnix] = getLocalMidnightUnixRange(-1);
        finalQuery = `${userQuery} after:${startUnix} before:${endUnix}`.trim();
      }
      else if (params.timeFilter === 'last24h') {
        // Last 24 hours = rolling 24 hour window
        const nowSec = Math.floor(Date.now() / 1000);
        const startSec = nowSec - 24 * 3600;
        finalQuery = `${userQuery} after:${startSec}`.trim();
      }
    }
    
    // Send the query with Unix timestamps to Gmail API
    const result = await client.listMessages({
      pageSize: params.maxResults || 25,
      pageToken: params.pageToken,
      query: finalQuery,
      category: params.category,
      autoFetchAll: params.autoFetchAll || false
    });

    if (result.items.length === 0) {
      let noResultsMessage = `No emails found matching`;
      
      // Add time filter description if applicable
      if (params.timeFilter) {
        if (params.timeFilter === 'today') {
          noResultsMessage += ` today (${getTodayDateQuery()})`;
        } else if (params.timeFilter === 'yesterday') {
          noResultsMessage += ` yesterday (${getYesterdayDateQuery()})`;
        } else if (params.timeFilter === 'last24h') {
          noResultsMessage += ` in the last 24 hours`;
        }
        
        noResultsMessage += ` with query: ${finalQuery}`;
      } else {
        noResultsMessage += ` query: ${finalQuery}`;
      }
      
      if (params.category) {
        noResultsMessage += ` in category ${params.category}`;
      }
      
      return { message: noResultsMessage };
    }
    
    // Check if query contains 'label:unread' to highlight unread status in response
    const isUnreadSearch = finalQuery.includes('label:unread');
    
    const emails = result.items.map(email => ({
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      snippet: email.content.substring(0, 100),
      isUnread: email.labels?.includes('UNREAD') || false,
      category: email.category,
      received: email.timestamp ? formatTimestamp(email.timestamp) : 'Unknown'
    }));
    
    // Create pagination message
    let paginationMessage = "";
    if (result.nextPageToken) {
      const estimatedRemaining = result.resultSizeEstimate - emails.length;
      paginationMessage = `\n\nThere are approximately ${estimatedRemaining} more results available.\n` +
        `To fetch the next page, use pageToken: "${result.nextPageToken}"\n` +
        `Alternatively, you can use autoFetchAll:true to automatically retrieve up to 100 emails without manual pagination.`;
    }
    
    // Add clarification about category vs label
    const categoryMessage = params.category ? 
      `\n\nNOTE: You searched in the "${params.category}" Gmail category. ` +
      `This is different from Gmail labels. Categories are fixed Gmail inbox sections ` +
      `(primary, social, promotions, updates, forums), while labels are custom tags.` : "";
    
    return {
      emails: emails,
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
      query: finalQuery,
      timeFilter: params.timeFilter,
      category: params.category,
      isUnreadSearch: isUnreadSearch,
      paginationHelp: paginationMessage,
      categoryHelp: categoryMessage
    };
  }
};

export const getRecentEmailsTool: Tool = {
  name: "get_recent_emails",
  description: "Get recent emails with support for time filters, categories, and read status",
  inputSchema: {
    type: "object",
    properties: {
      hours: {
        type: "number",
        description: "Number of hours to look back (can be omitted when using date filters in query)"
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (default: 25)"
      },
      query: {
        type: "string",
        description: "Additional Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"
      },
      pageToken: {
        type: "string",
        description: "Token for the next page of results"
      },
      category: {
        type: "string",
        enum: ["primary", "social", "promotions", "updates", "forums"],
        description: "Filter by Gmail category (primary, social, promotions, updates, forums)"
      },
      timeFilter: {
        type: "string",
        enum: ["today", "yesterday", "last24h"],
        description: "Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)"
      },
      autoFetchAll: {
        type: "boolean",
        description: "Automatically fetch all results (up to 100 items) without requiring pagination"
      }
    }
  },
  handler: async (client: GmailClientWrapper, params: {
    hours?: number;
    maxResults?: number;
    query?: string;
    pageToken?: string;
    category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
    timeFilter?: 'today' | 'yesterday' | 'last24h';
    autoFetchAll?: boolean;
  }) => {
    // Start with empty query or user-provided query
    let userQuery = params.query || '';
    
    // Apply correct unread syntax
    userQuery = ensureCorrectUnreadSyntax(userQuery);
    
    // Transform date-based operators to Unix timestamps
    userQuery = transformDateBasedOperators(userQuery);
    
    // Start with the transformed user query
    let finalQuery = userQuery;
    
    // Handle predefined time filters using Unix timestamps
    if (params.timeFilter) {
      if (params.timeFilter === 'today') {
        // Today = current calendar date (00:00 to 23:59)
        const [startUnix, endUnix] = getLocalMidnightUnixRange(0);
        finalQuery = `${userQuery} after:${startUnix} before:${endUnix}`.trim();
      } 
      else if (params.timeFilter === 'yesterday') {
        // Yesterday = previous calendar date (00:00 to 23:59)
        const [startUnix, endUnix] = getLocalMidnightUnixRange(-1);
        finalQuery = `${userQuery} after:${startUnix} before:${endUnix}`.trim();
      }
      else if (params.timeFilter === 'last24h') {
        // Last 24 hours = rolling 24 hour window
        const nowSec = Math.floor(Date.now() / 1000);
        const startSec = nowSec - 24 * 3600;
        finalQuery = `${userQuery} after:${startSec}`.trim();
      }
    } 
    // Check for explicit date filters in query - we don't need to add more filters
    else if (finalQuery.includes('after:') || finalQuery.includes('before:') || 
            finalQuery.includes('newer_than:') || finalQuery.includes('older_than:')) {
      // Query already has date filters, do nothing
    }
    // Default to hours if provided
    else if (params.hours) {
      const nowSec = Math.floor(Date.now() / 1000);
      const startSec = nowSec - params.hours * 3600;
      finalQuery = `${finalQuery} after:${startSec}`.trim();
    }
    // If no time filter specified, default to today
    else {
      const [startUnix, endUnix] = getLocalMidnightUnixRange(0);
      finalQuery = `${finalQuery} after:${startUnix} before:${endUnix}`.trim();
    }
    
    const result = await client.listMessages({
      pageSize: params.maxResults || 25,
      pageToken: params.pageToken,
      query: finalQuery,
      category: params.category,
      autoFetchAll: params.autoFetchAll || false
    });
    
    if (result.items.length === 0) {
      // Customize message based on time filter
      let timeDescription: string;
      if (params.timeFilter === 'today') {
        timeDescription = `today (${getTodayDateQuery()})`;
      } else if (params.timeFilter === 'yesterday') {
        timeDescription = `yesterday (${getYesterdayDateQuery()})`;
      } else if (params.timeFilter === 'last24h') {
        timeDescription = `the last 24 hours`;
      } else if (params.hours) {
        timeDescription = `the last ${params.hours} hours`;
      } else if (finalQuery.includes('after:') || finalQuery.includes('before:')) {
        timeDescription = `matching date filter: ${finalQuery}`;
      } else {
        timeDescription = `today (${getTodayDateQuery()})`;
      }
      
      let noResultsMessage = `No emails found from ${timeDescription}`;
      if (params.category) {
        noResultsMessage += ` in category ${params.category}`;
      }
      if (finalQuery.includes('label:unread')) {
        noResultsMessage += ` that are unread`;
      }
      
      return { message: noResultsMessage };
    }
    
    // Customize response text based on time filter
    let timeDescription: string;
    if (params.timeFilter === 'today') {
      timeDescription = `today (${getTodayDateQuery()})`;
    } else if (params.timeFilter === 'yesterday') {
      timeDescription = `yesterday (${getYesterdayDateQuery()})`;
    } else if (params.timeFilter === 'last24h') {
      timeDescription = `the last 24 hours`;
    } else if (params.hours) {
      timeDescription = `the last ${params.hours} hours`;
    } else if (finalQuery.includes('after:') || finalQuery.includes('before:')) {
      timeDescription = `matching date filter: ${finalQuery}`;
    } else {
      timeDescription = `today (${getTodayDateQuery()})`;
    }
    
    const emails = result.items.map(email => ({
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      snippet: email.content.substring(0, 100),
      isUnread: email.labels?.includes('UNREAD') || false,
      category: email.category,
      isInInbox: email.isInInbox,
      received: email.timestamp ? formatTimestamp(email.timestamp) : 'Unknown'
    }));
    
    // Create pagination message
    let paginationMessage = "";
    if (result.nextPageToken) {
      const estimatedRemaining = result.resultSizeEstimate - emails.length;
      paginationMessage = `\n\nThere are approximately ${estimatedRemaining} more results available.\n` +
        `To fetch the next page, use pageToken: "${result.nextPageToken}"\n` +
        `Alternatively, you can use autoFetchAll:true to automatically retrieve up to 100 emails without manual pagination.`;
    }
    
    // Add clarification about category vs label
    const categoryMessage = params.category ? 
      `\n\nNOTE: You searched in the "${params.category}" Gmail category. ` +
      `This is different from Gmail labels. Categories are fixed Gmail inbox sections ` +
      `(primary, social, promotions, updates, forums), while labels are custom tags.` : "";
    
    return {
      emails: emails,
      timeDescription: timeDescription,
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
      query: finalQuery,
      category: params.category,
      paginationHelp: paginationMessage,
      categoryHelp: categoryMessage
    };
  }
};

// Helper to format timestamp in a standardized way
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return 'Received: Unknown';
  // Folosim direct timestamp-ul care a fost deja formatat cu fusul orar
  return `Received: ${timestamp}`;
} 