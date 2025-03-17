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

// Schema definitions
const GetRecentEmailsSchema = z.object({
  hours: z.number().optional().default(24).describe("Number of hours to look back (default: 24, can be omitted when using date filters in query)"),
  maxResults: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
  query: z.string().optional().describe("Additional Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"),
  pageToken: z.string().optional().describe("Token for the next page of results"),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional()
    .describe("Filter by Gmail category (primary, social, promotions, updates, forums)"),
  timeFilter: z.enum(['today', 'yesterday', 'last24h']).optional()
    .describe("Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)")
});

const SearchEmailsSchema = z.object({
  query: z.string().describe("Gmail search query (e.g., 'label:unread', 'after:YYYY/MM/DD')"),
  maxResults: z.number().optional().default(10).describe("Maximum number of results to return"),
  pageToken: z.string().optional().describe("Token for the next page of results"),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional()
    .describe("Filter by Gmail category (primary, social, promotions, updates, forums)"),
  timeFilter: z.enum(['today', 'yesterday', 'last24h']).optional()
    .describe("Predefined time filter: 'today' (calendar date), 'yesterday' (calendar date), or 'last24h' (24 hour window)")
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
        description: "Maximum number of results to return (default: 10)"
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
  }) => {
    // Start with user provided query
    let fullQuery = params.query || '';
    
    // Apply correct unread syntax
    fullQuery = ensureCorrectUnreadSyntax(fullQuery);
    
    // Add time filter if specified and query doesn't already have date filters
    const hasDateFilter = fullQuery.includes('after:') || 
                         fullQuery.includes('before:') || 
                         fullQuery.includes('newer_than:') || 
                         fullQuery.includes('older_than:');
    
    if (params.timeFilter && !hasDateFilter) {
      if (params.timeFilter === 'today') {
        // Today = current calendar date (00:00 to 23:59)
        const todayQuery = getTodayQuery();
        fullQuery = fullQuery ? `${todayQuery} ${fullQuery}` : todayQuery;
      } 
      else if (params.timeFilter === 'yesterday') {
        // Yesterday = previous calendar date (00:00 to 23:59)
        const yesterdayQuery = getYesterdayQuery();
        fullQuery = fullQuery ? `${yesterdayQuery} ${fullQuery}` : yesterdayQuery;
      }
      else if (params.timeFilter === 'last24h') {
        // Last 24 hours = rolling 24 hour window
        const dateQuery = `after:${getDateQuery(24)}`;
        fullQuery = fullQuery ? `${dateQuery} ${fullQuery}` : dateQuery;
      }
    }
    
    const result = await client.listMessages({
      pageSize: params.maxResults || 10,
      pageToken: params.pageToken,
      query: fullQuery,
      category: params.category
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
        
        if (fullQuery !== getTodayQuery() && fullQuery !== getYesterdayQuery()) {
          noResultsMessage += ` with query: ${fullQuery}`;
        }
      } else {
        noResultsMessage += ` query: ${fullQuery}`;
      }
      
      if (params.category) {
        noResultsMessage += ` in category ${params.category}`;
      }
      
      return { message: noResultsMessage };
    }
    
    // Check if query contains 'label:unread' to highlight unread status in response
    const isUnreadSearch = fullQuery.includes('label:unread');
    
    return {
      emails: result.items.map(email => ({
        messageId: email.messageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        snippet: email.content.substring(0, 100),
        isUnread: email.labels?.includes('UNREAD') || false,
        category: email.category
      })),
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
      query: fullQuery,
      timeFilter: params.timeFilter,
      category: params.category,
      isUnreadSearch: isUnreadSearch
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
        description: "Maximum number of results to return (default: 10)"
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
  }) => {
    // Start with empty query or user-provided query
    let fullQuery = params.query || '';
    
    // Apply correct unread syntax
    fullQuery = ensureCorrectUnreadSyntax(fullQuery);
    
    // Handle predefined time filters (today, yesterday, last24h)
    if (params.timeFilter) {
      if (params.timeFilter === 'today') {
        // Today = current calendar date (00:00 to 23:59)
        const todayQuery = getTodayQuery();
        fullQuery = fullQuery ? `${todayQuery} ${fullQuery}` : todayQuery;
      } 
      else if (params.timeFilter === 'yesterday') {
        // Yesterday = previous calendar date (00:00 to 23:59)
        const yesterdayQuery = getYesterdayQuery();
        fullQuery = fullQuery ? `${yesterdayQuery} ${fullQuery}` : yesterdayQuery;
      }
      else if (params.timeFilter === 'last24h') {
        // Last 24 hours = rolling 24 hour window
        const dateQuery = `after:${getDateQuery(24)}`;
        fullQuery = fullQuery ? `${dateQuery} ${fullQuery}` : dateQuery;
      }
    } 
    // Check for explicit date filters in query
    else if (fullQuery.includes('after:') || fullQuery.includes('before:') || 
            fullQuery.includes('newer_than:') || fullQuery.includes('older_than:')) {
      // Query already has date filters
    }
    // Default to hours if provided
    else if (params.hours) {
      const dateQuery = `after:${getDateQuery(params.hours)}`;
      fullQuery = fullQuery ? `${dateQuery} ${fullQuery}` : dateQuery;
    }
    // If no time filter specified, default to today
    else {
      const todayQuery = getTodayQuery();
      fullQuery = fullQuery ? `${todayQuery} ${fullQuery}` : todayQuery;
    }
    
    const result = await client.listMessages({
      pageSize: params.maxResults || 10,
      pageToken: params.pageToken,
      query: fullQuery,
      category: params.category
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
      } else if (fullQuery.includes('after:') || fullQuery.includes('before:')) {
        timeDescription = `matching date filter: ${fullQuery}`;
      } else {
        timeDescription = `today (${getTodayDateQuery()})`;
      }
      
      let noResultsMessage = `No emails found from ${timeDescription}`;
      if (params.category) {
        noResultsMessage += ` in category ${params.category}`;
      }
      if (fullQuery.includes('label:unread')) {
        noResultsMessage += ` that are unread`;
      }
      
      return { message: noResultsMessage };
    }
    
    return {
      emails: result.items.map(email => ({
        messageId: email.messageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        snippet: email.content.substring(0, 100),
        isUnread: email.labels?.includes('UNREAD') || false,
        category: email.category
      })),
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
      query: fullQuery,
      timeFilter: params.timeFilter,
      category: params.category,
      isUnreadSearch: fullQuery.includes('label:unread')
    };
  }
}; 