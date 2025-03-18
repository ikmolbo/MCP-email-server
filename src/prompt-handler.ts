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

  send_reply_all: {
    name: "send_reply_all",
    description: "Reply to an email and include all original recipients",
    template: `
When you need to Reply All to an email, keeping all original recipients in the loop, you need:

1. Original Message ID (required)
   This identifies the specific email you're replying to

2. Reply Content (required) 
   The body text of your reply message

3. Additional Recipients (optional)
   Any new recipients you want to add to the conversation

4. Exclude Recipients (optional)
   Any original recipients you want to remove from this reply

WHAT REPLY ALL DOES:
- Sends a reply to the original sender AND all other recipients (To + CC)
- Maintains the email thread (keeps subject with Re: prefix)
- Sets proper email headers to show as part of the same conversation
- Excludes your own email address to prevent sending to yourself
- Uses the correct "From" address (the one that received the original email)

Example usage:
- Reply to a work email including everyone in the original thread
- Continue a group conversation
- Respond to a message where multiple people need to see your response

Note: You only need to provide the messageId and your reply content.
The tool will automatically:
1. Extract all original recipients
2. Filter out your own email address
3. Format the subject line correctly
4. Set all required email headers for threading
    `,
    parameters: ["messageId", "body", "additionalRecipients", "excludeRecipients"],
    required_output: ["messageId", "threadId", "to", "cc"]
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
  },

  label_management: {
    name: "label_management",
    description: "Manage Gmail labels including listing, creating, updating, and deleting labels",
    template: `
To manage Gmail labels, you can use the following operations:

1. LIST LABELS
   - Lists all labels in your mailbox
   - Shows system labels (like INBOX, SENT, TRASH) and your custom labels
   - Provides label IDs needed for other operations
   - No parameters needed

2. GET LABEL DETAILS
   - Shows full details about a specific label including:
     * Name, ID, and type (system or user)
     * Visibility settings
     * Color information
     * Message and thread counts
   - Required parameter: labelId

3. CREATE LABEL
   - Creates a new custom label in your mailbox
   - Required parameter: name
   - Optional parameters:
     * messageListVisibility: "show" or "hide" (controls visibility in message list)
     * labelListVisibility: "labelShow", "labelShowIfUnread", or "labelHide" (controls visibility in label list)
     * textColor: hex color code (e.g., "#000000")
     * backgroundColor: hex color code (e.g., "#ffffff")

4. UPDATE LABEL
   - Modifies an existing label's properties
   - Required parameter: labelId
   - Optional parameters (only specify what you want to change):
     * name: new name for the label
     * messageListVisibility: "show" or "hide"
     * labelListVisibility: "labelShow", "labelShowIfUnread", or "labelHide"
     * textColor: hex color code
     * backgroundColor: hex color code

5. DELETE LABEL
   - Permanently removes a label from your mailbox
   - The label will also be removed from any messages it was applied to
   - Required parameter: labelId
   - IMPORTANT: Cannot delete system labels (INBOX, SENT, etc.)

6. MODIFY MESSAGE LABELS
   - Add and/or remove labels from a specific message
   - Required parameter: messageId
   - Optional parameters (at least one required):
     * addLabelIds: array of label IDs to add
     * removeLabelIds: array of label IDs to remove

COMMON OPERATIONS:

1. Mark message as read:
   - Removes the UNREAD label
   - Required parameter: messageId

2. Mark message as unread:
   - Adds the UNREAD label
   - Required parameter: messageId

3. Archive message:
   - Removes the INBOX label
   - Required parameter: messageId

4. Move message to inbox:
   - Adds the INBOX label
   - Required parameter: messageId

5. Move message to trash:
   - Adds the TRASH label and removes from INBOX
   - Required parameter: messageId

IMPORTANT NOTES:
- System labels have uppercase names (INBOX, UNREAD, TRASH, etc.)
- User labels generally use regular casing
- You cannot modify system label properties
- Gmail has a limit of 10,000 labels per mailbox
    `,
    parameters: [],
    required_output: ["operation", "parameters"]
  },
  
  modify_labels: {
    name: "modify_labels",
    description: "Add or remove labels from a message",
    template: `
To add or remove labels from a message, please provide:

1. The message ID (required)
2. Labels to add (optional)
3. Labels to remove (optional)

You must specify at least one label to add or remove.

SYSTEM LABELS:
- INBOX - Message appears in inbox
- UNREAD - Message is marked as unread
- STARRED - Message is starred
- IMPORTANT - Message is marked as important
- SENT - Message was sent by the user
- DRAFT - Message is a draft
- TRASH - Message is in trash
- SPAM - Message is in spam

COMMON OPERATIONS:
- To mark as read: remove UNREAD label
- To mark as unread: add UNREAD label
- To archive: remove INBOX label
- To move to inbox: add INBOX label
- To trash: add TRASH label and remove INBOX label

Label IDs for custom labels can be found using the list_labels tool.
    `,
    parameters: ["messageId", "addLabelIds", "removeLabelIds"],
    required_output: ["messageId", "labels"]
  },

  timezone_info: {
    name: "timezone_info",
    description: "Verifică configurația de fus orar a sistemului",
    template: `
Pentru a verifica configurația de fus orar a sistemului, poți folosi tool-ul get_timezone_info.

Acest tool va returna următoarele informații:
1. Fusul orar configurat (din variabila TIME_ZONE)
2. Offsetul calculat în ore
3. Data și ora curentă ajustată la fusul orar
4. Data și ora în UTC pentru comparație

Aceste informații te vor ajuta să înțelegi:
- Ce fus orar este configurat în sistem
- Cum sunt ajustate timestamp-urile emailurilor la acest fus orar
- Diferența dintre ora UTC și ora locală

Pentru a schimba fusul orar, configurația TIME_ZONE trebuie modificată la nivel de sistem.
    `,
    parameters: [],
    required_output: ["timeZoneConfig", "offsetHours", "currentTimeLocal", "currentTimeUTC"]
  },

  send_as_accounts: {
    name: "send_as_accounts",
    description: "Lista conturilor și adreselor de email care pot fi folosite pentru trimiterea email-urilor",
    template: `
Pentru a gestiona email-urile trimise din diferite adrese, poți folosi tool-ul list_send_as_accounts.

Acest tool va lista toate conturile și adresele de email care pot fi folosite pentru trimiterea mesajelor, inclusiv:
1. Adresa de email principală asociată cu contul Gmail
2. Orice alias sau adresă alternativă configurată pentru "Send As"
3. Indicarea adresei implicite (default) pentru trimiterea email-urilor

Informațiile returnate includ:
- email: Adresa de email
- name: Numele afișat pentru adresă
- isDefault: Dacă este adresa implicită pentru trimiterea email-urilor
- isPrimary: Dacă este adresa principală a contului
- verificationStatus: Starea de verificare a adresei

Cum să folosești aceste informații:
- În tool-ul send_email, poți specifica parametrul "from" cu una dintre aceste adrese
- În tool-urile de reply și reply_all, adresa potrivită va fi selectată automat (adresa la care a fost trimis email-ul original)
- Email-urile tale nu vor fi incluși în destinatari când folosești reply_all (evitarea auto-trimiterii)

IMPORTANT: Întotdeauna trimite de la adresa corectă în funcție de context! Dacă răspunzi la un email trimis la o anumită adresă, folosește acea adresă pentru răspuns.
    `,
    parameters: [],
    required_output: ["accounts", "defaultAccount", "count"]
  },

  forward_email: {
    name: "forward_email",
    description: "Redirecționează (forward) un email către alți destinatari",
    template: `
Pentru a redirecționa (forward) un email către alți destinatari, folosește tool-ul forward_email.

Parametri necesari:
1. messageId - ID-ul mesajului care va fi redirecționat
2. to - Lista de destinatari care vor primi email-ul redirecționat

Parametri opționali:
- additionalContent - Conținut suplimentar pe care vrei să-l adaugi înainte de mesajul redirecționat
- cc - Lista de destinatari CC
- from - Adresa specifică de la care vrei să trimiți (din conturile tale send-as)

Comportament:
- Subiectul va fi prefixat automat cu "Fwd:" dacă nu are deja acest prefix
- Conținutul va include headerele mesajului original (From, Date, Subject, To, Cc)
- Destinatarii proprii sunt eliminați automat din liste pentru a evita auto-trimiterea
- Dacă nu specifici o adresă "from", se va folosi adresa implicită din conturile tale

Exemplu de utilizare:
"Vreau să redirecționez emailul cu ID-ul <message_id> către john@example.com și să adaug un comentariu înainte."

Notă: Email-ul redirecționat va conține tot conținutul original, inclusiv headerele și atașamentele.
    `,
    parameters: ["messageId", "to", "additionalContent", "cc", "from"],
    required_output: ["messageId", "threadId", "to", "subject", "from"]
  },

  draft_management: {
    name: "draft_management",
    description: "Gestionează ciornele (drafts) din contul de email",
    template: `
Pentru a gestiona ciornele de email, ai la dispoziție următoarele tool-uri:

1. CREATE_DRAFT
   Creează o ciornă nouă pentru un email.
   Parametri necesari:
   - to: Lista de destinatari
   - subject: Subiectul emailului
   - body: Conținutul emailului
   Parametri opționali:
   - cc: Destinatari în CC
   - bcc: Destinatari în BCC
   - from: Adresa de la care trimiți

2. GET_DRAFT
   Obține detaliile unei ciorne existente.
   Parametru necesar:
   - draftId: ID-ul ciornei

3. LIST_DRAFTS
   Listează toate ciornele din cont.
   Parametri opționali:
   - maxResults: Numărul maxim de ciorne (implicit 20)
   - pageToken: Token pentru pagina următoare
   - query: Filtru de căutare

4. UPDATE_DRAFT
   Actualizează o ciornă existentă.
   Parametri necesari:
   - draftId: ID-ul ciornei
   - to: Lista nouă de destinatari
   - subject: Subiectul nou
   - body: Conținutul nou
   Parametri opționali:
   - cc, bcc, from: Ca la create_draft

5. DELETE_DRAFT
   Șterge permanent o ciornă.
   Parametru necesar:
   - draftId: ID-ul ciornei

6. SEND_DRAFT
   Trimite o ciornă existentă.
   Parametru necesar:
   - draftId: ID-ul ciornei

FLUX TIPIC DE LUCRU:
1. Creezi o ciornă cu create_draft
2. Verifici ciorna cu get_draft sau list_drafts
3. Actualizezi ciorna cu update_draft dacă este necesar
4. Trimiți ciorna cu send_draft sau o ștergi cu delete_draft

Ciornele sunt utile când:
- Vrei să pregătești un email important înainte de a-l trimite
- Trebuie să revii la un email mai târziu pentru a-l finaliza
- Ai nevoie să salvezi un șablon de email pentru utilizare frecventă
- Vrei să verifici conținutul înainte de a trimite
    `,
    parameters: [],
    required_output: ["operation", "draftId"]
  },

  attachment_management: {
    name: "attachment_management",
    description: "Gestionează atașamentele email-urilor",
    template: `
Pentru a gestiona atașamentele email-urilor, ai la dispoziție următoarele tool-uri:

1. LIST_ATTACHMENTS
   Listează toate atașamentele dintr-un email.
   Parametru necesar:
   - messageId: ID-ul mesajului pentru care se listează atașamentele
   Rezultat:
   - Lista cu toate atașamentele și detaliile lor (nume, tip, dimensiune)

2. GET_ATTACHMENT
   Obține un atașament specific dintr-un email.
   Parametri necesari:
   - messageId: ID-ul mesajului care conține atașamentul
   - attachmentId: ID-ul atașamentului
   Rezultat:
   - Detaliile atașamentului și conținutul acestuia

FLUX TIPIC DE LUCRU:
1. Obții un email folosind read_email sau search_emails
2. Listezi atașamentele acestuia cu list_attachments
3. Descarci un atașament specific cu get_attachment

Este util să folosești list_attachments mai întâi pentru a vedea ce atașamente sunt disponibile și pentru a obține ID-urile lor, înainte de a descărca atașamente specifice.

Notă: Atașamentele pot fi de diferite tipuri: documente, imagini, arhive, etc. Tipul MIME al atașamentului îți indică formatul acestuia.
    `,
    parameters: ["messageId", "attachmentId"],
    required_output: ["operation", "messageId", "attachments"]
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