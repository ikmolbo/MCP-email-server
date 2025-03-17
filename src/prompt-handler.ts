import { GetPromptRequest, GetPromptResult, ListPromptsResult } from "@modelcontextprotocol/sdk/types.js";

export interface EmailPrompt {
  name: string;
  description: string;
  template: string;
  parameters: string[];
  required_output: string[];
}

export const emailPrompts: Record<string, EmailPrompt> = {
  read_email: {
    name: "read_email",
    description: "Read an email and extract all necessary context including state, category and thread information",
    template: `
Given an email message, please analyze and provide:

1. Basic Information:
   - Subject
   - From address
   - To address(es)
   - Date received
   - Message ID
   - Thread ID (if part of a thread)

2. Email State:
   - Read/Unread status
   - Location (Inbox, Archive, Trash, etc.)
   - Category (Primary, Social, Promotions, etc.)
   - Labels attached

3. Thread Context (if applicable):
   - Position in thread (first message, reply, etc.)
   - Number of messages in thread
   - Other participants in thread

4. Content:
   - Full message content
   - Format (plain text/HTML)
   - Quote level (if it's a reply)

5. Attachments (if any):
   - File names
   - Types
   - Sizes

Please format the output as follows:
----------------------------------------
BASIC INFORMATION
Subject: [subject]
From: [from_address]
To: [to_addresses]
Date: [date]
Message ID: [message_id]
Thread ID: [thread_id]

EMAIL STATE
Read Status: [read/unread]
Location: [inbox/archive/trash]
Category: [primary/social/promotions/updates/forums]
Labels: [list of labels]

THREAD CONTEXT
Thread Position: [position]
Messages in Thread: [count]
Participants: [list of participants]

CONTENT
Format: [text/html]
[content]

ATTACHMENTS
[list of attachments with details]
----------------------------------------

This detailed information helps:
- Understand the complete context of the email
- Track its state in your inbox
- See its relationship with other emails
- Make informed decisions about replies or actions
    `,
    parameters: ["messageId"],
    required_output: [
      "messageId", 
      "threadId", 
      "subject", 
      "from", 
      "to", 
      "date", 
      "isUnread", 
      "category", 
      "isInInbox", 
      "labels", 
      "content"
    ]
  },
  
  send_email: {
    name: "send_email",
    description: "Send a new email",
    template: `
To send a new email, please provide:
1. Recipient address(es)
2. Subject
3. Content
4. From address (optional)

The email will be sent using the specified from address or the default one if not provided.
    `,
    parameters: ["to", "subject", "content", "from"],
    required_output: ["messageId"]
  },

  send_reply: {
    name: "send_reply",
    description: "Send a reply in an email thread",
    template: `
To properly reply to an email, we need:
1. Original message Thread ID
2. Original recipient address (to use as sender)
3. Subject (prefixed with Re:)
4. Content
5. References to maintain thread

The reply will be sent:
- In the same thread as the original message
- From the same address that received the original message
- With proper threading headers

Please ensure all these elements are provided to maintain email thread context.
    `,
    parameters: ["threadId", "fromAddress", "subject", "content", "inReplyTo"],
    required_output: ["messageId", "threadId"]
  },

  get_recent_emails: {
    name: "get_recent_emails",
    description: "Get recent emails with support for Gmail categories, read state, and date filtering",
    template: `
To get recent emails, please CHOOSE ONE time filtering method:

OPTION 1: Use the timeFilter parameter (RECOMMENDED FOR CALENDAR DATES)
- timeFilter: "today" - Gets emails from today's calendar date (00:00 to 23:59)
- timeFilter: "yesterday" - Gets emails from yesterday's calendar date
- timeFilter: "last24h" - Gets emails from the last 24 hours (rolling window)

OPTION 2: Use the hours parameter (FOR TIME WINDOWS)
- hours: 24 - Gets emails from the last 24 hours (rolling window)
- hours: 48 - Gets emails from the last 48 hours

OPTION 3: Use date filters in query parameter (FOR CUSTOM DATE RANGES)
- query: "after:YYYY/MM/DD before:YYYY/MM/DD" - Gets emails between specific dates

IMPORTANT DISTINCTIONS:
- For "today" (a calendar date), use timeFilter:"today" not hours:24
- For "last 24 hours" (a time window), use timeFilter:"last24h" or hours:24
- For unread emails, ALWAYS use "label:unread" not "is:unread"

You can also specify:
- category (optional): "primary", "social", "promotions", "updates", "forums"
- maxResults (optional): maximum number of results to return (default: 25)
- query (optional): additional Gmail search criteria
- autoFetchAll (optional): set to true to automatically fetch all results (up to 100) without manual pagination

CATEGORIES VS LABELS:
- CATEGORIES are Gmail's inbox sections (primary, social, promotions, updates, forums)
  * To filter by category: use the "category" parameter
  * Example: category: "forums" (NOT "label:forums" or "category:forums" in query)
  
- LABELS are custom tags in Gmail (like "unread", "important", "work", etc.)
  * To filter by label: include "label:X" in the query parameter
  * Example: query: "label:unread label:important" (NOT category: "unread")

Common search patterns:
1. Today's unread emails from Primary:
   timeFilter: "today", category: "primary", query: "label:unread"

2. Last 3 unread emails from Updates category:
   timeFilter: "last24h", category: "updates", query: "label:unread", maxResults: 3

3. Unread emails from yesterday needing reply:
   timeFilter: "yesterday", query: "label:unread -has:muted -in:sent"

4. Today's important notifications:
   timeFilter: "today", category: "updates", query: "label:important"

5. All unread forum emails (up to 100) from March 16, 2025:
   query: "after:2025/03/16 before:2025/03/17 label:unread", category: "forums", autoFetchAll: true

PAGINATION:
- By default, only 25 results are returned even if more matching emails exist
- If there are more results, a nextPageToken will be provided
- To view all results at once (up to 100), use autoFetchAll: true
- To get specific pages, use the pageToken parameter with the token from previous results

The search will return:
- Email subject, sender, and recipients
- Email category and read state
- Whether the email is in inbox
- Timestamp when email was received
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["hours", "category", "maxResults", "query", "pageToken", "timeFilter", "autoFetchAll"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInInbox", "received"]
  },

  search_emails: {
    name: "search_emails",
    description: "Search for emails with support for Gmail categories, read state, and precise date filtering",
    template: `
To search for emails, please provide:
1. Search query (required)
2. Time filter (optional but RECOMMENDED):
   - timeFilter: "today" - Search within today's calendar date (00:00 to 23:59)
   - timeFilter: "yesterday" - Search within yesterday's calendar date
   - timeFilter: "last24h" - Search within last 24 hours (rolling window)

You can also specify:
- category (optional): "primary", "social", "promotions", "updates", "forums"
- maxResults (optional): maximum number of results to return (default: 25)
- autoFetchAll (optional): set to true to automatically fetch all results (up to 100) without manual pagination

IMPORTANT DISTINCTIONS:
- For "today" (a calendar date), use timeFilter:"today" not date in query
- For "yesterday", use timeFilter:"yesterday"
- For unread emails, ALWAYS use "label:unread" not "is:unread"

CATEGORIES VS LABELS:
- CATEGORIES are Gmail's inbox sections (primary, social, promotions, updates, forums)
  * To filter by category: use the "category" parameter
  * Example: category: "forums" (NOT "label:forums" or "category:forums" in query)
  
- LABELS are custom tags in Gmail (like "unread", "important", "work", etc.)
  * To filter by label: include "label:X" in the query parameter
  * Example: query: "label:unread label:important" (NOT category: "unread")

Common search patterns:
1. Today's unread emails in Primary:
   query: "label:unread", timeFilter: "today", category: "primary"

2. Unread emails from last week in Updates:
   query: "label:unread newer_than:7d", category: "updates"

3. Unanswered emails in Primary from today:
   query: "label:unread -in:sent", timeFilter: "today", category: "primary"

4. Important unread notifications from today:
   query: "label:unread label:important", timeFilter: "today", category: "updates"

5. Emails needing follow-up received yesterday:
   query: "label:unread -has:muted -in:sent", timeFilter: "yesterday"

6. All forum emails (up to 100) from March 16, 2025:
   query: "after:2025/03/16 before:2025/03/17", category: "forums", autoFetchAll: true

PAGINATION:
- By default, only 25 results are returned even if more matching emails exist
- If there are more results, a nextPageToken will be provided
- To view all results at once (up to 100), use autoFetchAll: true
- To get specific pages, use the pageToken parameter with the token from previous results

Search operators to remember:
- "label:unread" for unread emails (NOT "is:unread")
- "after:YYYY/MM/DD" for emails after specific date
- "before:YYYY/MM/DD" for emails before specific date
- "newer_than:Nd" for emails from last N days
- "-in:sent" to exclude sent emails
- "has:attachment" for emails with attachments
- "label:important" for important emails
- "-has:muted" to exclude muted conversations

The search will return:
- Email subject, sender, and recipients
- Email category and read state
- Whether the email is in inbox
- Timestamp when email was received
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["query", "category", "maxResults", "pageToken", "timeFilter", "autoFetchAll"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInInbox", "received"]
  }
};

export function createPromptHandler() {
  return {
    listPrompts: async (): Promise<ListPromptsResult> => ({
      prompts: Object.values(emailPrompts).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        parameters: prompt.parameters,
        required_output: prompt.required_output
      }))
    }),
    
    getPrompt: async (request: GetPromptRequest): Promise<GetPromptResult> => {
      const promptName = request.params.name as string;
      const prompt = emailPrompts[promptName];
      
      if (!prompt) {
        throw new Error(`Prompt '${promptName}' not found`);
      }
      
      const parameters = request.params.parameters as Record<string, string>;
      
      // Validate required parameters
      const missingParams = prompt.parameters.filter(
        param => !(param in parameters)
      );
      
      if (missingParams.length > 0) {
        throw new Error(
          `Missing required parameters: ${missingParams.join(", ")}`
        );
      }
      
      // Format the prompt template with provided parameters
      let formattedPrompt = prompt.template;
      for (const [key, value] of Object.entries(parameters)) {
        formattedPrompt = formattedPrompt.replace(
          new RegExp(`{${key}}`, "g"),
          String(value)
        );
      }
      
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: formattedPrompt
          }
        }],
        _meta: {
          required_output: prompt.required_output
        }
      };
    }
  };
} 