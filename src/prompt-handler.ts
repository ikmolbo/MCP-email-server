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
    description: "Get recent emails with support for Gmail categories and read state",
    template: `
To get recent emails, please provide:

1. Filter by time (choose one):
   - Hours to look back (default: 24)
   - Use today's date (set useToday=true)
   - Specific date (format: YYYY-MM-DD)

2. Category (optional: primary, social, promotions, updates, forums)

3. Additional search criteria (optional)

Common search patterns:
1. Today's unread emails in Primary:
   useToday: true, category: "primary", query: "label:unread"

2. Unread emails from Updates from a specific date:
   date: "2025-03-20", category: "updates", query: "label:unread"

3. Important unread notifications from past week:
   hours: 168, category: "updates", query: "label:unread label:important"

4. Unread emails requiring action:
   hours: 24, query: "label:unread -has:muted -in:sent"

IMPORTANT NOTES:
- ALWAYS use "label:unread" instead of "is:unread" in queries
- For date filtering, prefer useToday=true for today's emails 
- For specific dates, use the date parameter with format YYYY-MM-DD

The search will return:
- Email subject, sender, and recipients
- Email category and read/unread status (clearly marked)
- Whether the email is in inbox
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["hours", "category", "maxResults", "query", "pageToken", "date", "useToday"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInInbox"]
  },

  search_emails: {
    name: "search_emails",
    description: "Search for emails with support for Gmail categories and read state",
    template: `
To search for emails, please provide:
1. Search query (required)
2. Category (optional: primary, social, promotions, updates, forums)
3. Max results (optional, default: 10)

Common search patterns:
1. Unread emails in Primary:
   query: "label:unread", category: "primary"

2. Today's unread emails:
   query: "label:unread after:${new Date().toISOString().split('T')[0]}"

3. Unread emails from last week in Updates:
   query: "label:unread newer_than:7d", category: "updates"

4. Unanswered emails in Primary from today:
   query: "label:unread -in:sent after:${new Date().toISOString().split('T')[0]}", category: "primary"

5. Important unread notifications:
   query: "label:unread label:important", category: "updates"

IMPORTANT NOTES:
- ALWAYS use "label:unread" instead of "is:unread"
- For today's emails use: "after:${new Date().toISOString().split('T')[0]}"
- For a specific date use: "after:YYYY-MM-DD before:YYYY-MM-DD+1d"
- Use "newer_than:Nd" for N days ago
- "-in:sent" to exclude sent emails
- "has:attachment" for emails with attachments
- "label:important" for important emails
- "-has:muted" to exclude muted conversations

The search will return:
- Email subject, sender, and recipients
- Email category and read/unread status (clearly marked)
- Whether the email is in inbox
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["query", "category", "maxResults", "pageToken"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInInbox"]
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