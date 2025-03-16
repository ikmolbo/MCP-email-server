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
    description: "Read an email and extract all necessary context",
    template: `
Given an email message, please extract and provide:
1. Subject
2. From address
3. To address(es)
4. Thread ID
5. Message ID
6. Content
7. Attachments (if any)

This information will be used for:
- Understanding the email context
- Enabling proper replies in the same thread
- Ensuring replies are sent from the correct address

Please format the output as follows:
Subject: [subject]
From: [from_address]
To: [to_addresses]
Thread ID: [thread_id]
Message ID: [message_id]
Content:
[content]

Attachments:
[list of attachments if any]
    `,
    parameters: ["messageId"],
    required_output: ["threadId", "toAddress", "messageId", "subject", "content"]
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