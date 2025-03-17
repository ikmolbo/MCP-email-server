import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosResponse } from 'gaxios';
import { encodeEmailSubject } from './utils.js';
import { timeZoneOffset, formatTimestampWithOffset } from './timezone-utils.js';

export interface PaginationOptions {
  pageSize?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  query?: string;
  category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  autoFetchAll?: boolean;
  maxAutoFetchResults?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface EmailData {
  threadId?: string;
  messageId: string;
  headers: gmail_v1.Schema$MessagePartHeader[];
  subject: string;
  from: string;
  to: string[];
  content: string;
  labels?: string[];
  isUnread: boolean;
  category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  isInInbox: boolean;
  timestamp?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    data: string;
  }>;
}

export class GmailClientWrapper {
  private gmail: gmail_v1.Gmail;
  private userId: string = 'me';

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async listMessages(options: PaginationOptions = {}): Promise<PaginatedResponse<EmailData>> {
    try {
      let query = options.query || '';
      
      // Handle category search
      if (options.category) {
        switch (options.category) {
          case 'primary':
            // For Primary: in inbox but not in other categories
            query = query ? `${query} in:inbox -category:{social promotions updates forums}` 
                        : 'in:inbox -category:{social promotions updates forums}';
            break;
          case 'social':
            query = query ? `${query} category:social` : 'category:social';
            break;
          case 'promotions':
            query = query ? `${query} category:promotions` : 'category:promotions';
            break;
          case 'updates':
            query = query ? `${query} category:updates` : 'category:updates';
            break;
          case 'forums':
            query = query ? `${query} category:forums` : 'category:forums';
            break;
        }
      }

      // Add label filters if specified
      if (options.labelIds?.length) {
        const labelQuery = options.labelIds.map(label => `label:${label}`).join(' ');
        query = query ? `${query} ${labelQuery}` : labelQuery;
      }

      // Ensure query is properly formatted
      query = query.trim();
      
      // Handle special search operators
      if (query.includes('is:unread')) {
        query = query.replace(/is:unread/g, 'label:unread');
      }

      console.error('Final query:', query); // Debug log

      // Inițializăm răspunsul final pentru cazul paginării automate
      let allItems: EmailData[] = [];
      let finalNextPageToken: string | undefined = undefined;
      let totalResultSizeEstimate = 0;
      let currentPageToken = options.pageToken;
      
      // Stabilim dimensiunea paginii și limita maximă pentru paginarea automată
      const pageSize = options.pageSize || 25; // Implicit aducem 25 de rezultate
      const maxAutoFetchResults = options.maxAutoFetchResults || 100; // Limită maximă de 100 email-uri
      
      // Bucla pentru paginare automată
      do {
        const response = await this.gmail.users.messages.list({
          userId: this.userId,
          maxResults: pageSize,
          pageToken: currentPageToken,
          includeSpamTrash: options.includeSpamTrash,
          q: query
        });
        
        const messages = response.data.messages || [];
        const messageDetails = await Promise.all(
          messages.map(msg => this.getMessage(msg.id!))
        );
        
        // Adăugăm rezultatele la lista completă
        allItems = [...allItems, ...messageDetails];
        
        // Actualizăm token-ul pentru următoarea pagină
        currentPageToken = response.data.nextPageToken || undefined;
        finalNextPageToken = currentPageToken;
        
        // Actualizăm estimarea totală a rezultatelor
        totalResultSizeEstimate = response.data.resultSizeEstimate || allItems.length;
        
        // Verificăm condițiile de oprire pentru paginarea automată
        if (!options.autoFetchAll || allItems.length >= maxAutoFetchResults || !currentPageToken) {
          break;
        }
        
      } while (true);
      
      return {
        items: allItems,
        nextPageToken: finalNextPageToken,
        resultSizeEstimate: totalResultSizeEstimate
      };
    } catch (error) {
      throw new Error(`Failed to list messages: ${error}`);
    }
  }

  async getMessage(messageId: string): Promise<EmailData> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: this.userId,
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      const labels = message.labelIds || [];
      
      // Determine email state from labels
      const isUnread = labels.includes('UNREAD');
      const isInInbox = labels.includes('INBOX');
      
      // Determine category based on Gmail's category system
      let category: EmailData['category'] = undefined;
      
      // Check for category based on Gmail's actual categorization
      if (isInInbox) {
        if (labels.some(l => l.startsWith('CATEGORY_'))) {
          if (labels.includes('CATEGORY_SOCIAL')) category = 'social';
          else if (labels.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
          else if (labels.includes('CATEGORY_UPDATES')) category = 'updates';
          else if (labels.includes('CATEGORY_FORUMS')) category = 'forums';
        } else {
          // If in inbox but no category, it's primary
          category = 'primary';
        }
      }
      
      // Extract date information from headers
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
      let timestamp: string | undefined = undefined;
      
      if (dateHeader) {
        try {
          // Parse the date header and apply timezone offset
          const dateObj = new Date(dateHeader);
          // Folosim funcția formatTimestampWithOffset pentru a aplica offsetul
          timestamp = formatTimestampWithOffset(dateHeader);
        } catch (e) {
          console.error('Error parsing date header:', e);
          // If parsing fails, use the original header value
          timestamp = dateHeader;
        }
      }
      
      return {
        threadId: message.threadId || undefined,
        messageId: message.id || messageId,
        headers: headers,
        subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '',
        from: headers.find(h => h.name?.toLowerCase() === 'from')?.value || '',
        to: (headers.find(h => h.name?.toLowerCase() === 'to')?.value || '').split(',').map(e => e.trim()),
        content: this.extractContent(message),
        labels: labels,
        isUnread,
        category,
        isInInbox,
        timestamp,
        attachments: this.extractAttachments(message),
      };
    } catch (error) {
      throw new Error(`Failed to get message: ${error}`);
    }
  }

  async getSendAsAliases(): Promise<gmail_v1.Schema$SendAs[]> {
    try {
      const response = await this.gmail.users.settings.sendAs.list({
        userId: this.userId,
      });
      return response.data.sendAs || [];
    } catch (error) {
      throw new Error(`Failed to get send-as aliases: ${error}`);
    }
  }

  async sendMessage(options: {
    to: string[];
    subject: string;
    content: string;
    threadId?: string;
    from?: string;
    inReplyTo?: string;
    references?: string[];
  }): Promise<{ messageId: string; threadId?: string }> {
    try {
      const raw = await this.createEmailRaw(options);
      const response = await this.gmail.users.messages.send({
        userId: this.userId,
        requestBody: {
          raw,
          threadId: options.threadId,
        },
      });

      return {
        messageId: response.data.id || '',
        threadId: response.data.threadId || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  private extractContent(message: gmail_v1.Schema$Message): string {
    const parts = message.payload?.parts || [];
    const plainTextPart = parts.find(part => part.mimeType === 'text/plain');
    const htmlPart = parts.find(part => part.mimeType === 'text/html');
    
    let content = '';
    if (plainTextPart?.body?.data) {
      content = Buffer.from(plainTextPart.body.data, 'base64').toString();
    } else if (htmlPart?.body?.data) {
      content = Buffer.from(htmlPart.body.data, 'base64').toString();
    } else if (message.payload?.body?.data) {
      content = Buffer.from(message.payload.body.data, 'base64').toString();
    }
    
    return content;
  }

  private extractAttachments(message: gmail_v1.Schema$Message): Array<{
    filename: string;
    mimeType: string;
    data: string;
  }> {
    const attachments: Array<{
      filename: string;
      mimeType: string;
      data: string;
    }> = [];

    const parts = message.payload?.parts || [];
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          data: part.body.data || '',
        });
      }
    }

    return attachments;
  }

  private async createEmailRaw(options: {
    to: string[];
    subject: string;
    content: string;
    from?: string;
    inReplyTo?: string;
    references?: string[];
  }): Promise<string> {
    const encodedSubject = encodeEmailSubject(options.subject);
    
    const headers = [
      `To: ${options.to.join(', ')}`,
      `Subject: ${encodedSubject}`,
      options.from ? `From: ${options.from}` : '',
      options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
      options.references?.length ? `References: ${options.references.join(' ')}` : '',
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    ].filter(Boolean).join('\r\n');

    const email = `${headers}\r\n\r\n${options.content}`;
    return Buffer.from(email).toString('base64url');
  }
  
  // Label management methods
  
  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: this.userId
      });
      return response.data.labels || [];
    } catch (error) {
      throw new Error(`Failed to list labels: ${error}`);
    }
  }
  
  async getLabel(labelId: string): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.get({
        userId: this.userId,
        id: labelId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get label ${labelId}: ${error}`);
    }
  }
  
  async createLabel(name: string, options?: { 
    messageListVisibility?: 'show' | 'hide',
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide',
    color?: { 
      textColor?: string, 
      backgroundColor?: string 
    }
  }): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: this.userId,
        requestBody: {
          name,
          messageListVisibility: options?.messageListVisibility,
          labelListVisibility: options?.labelListVisibility,
          color: options?.color
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create label "${name}": ${error}`);
    }
  }
  
  async updateLabel(labelId: string, updates: {
    name?: string,
    messageListVisibility?: 'show' | 'hide',
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide',
    color?: { 
      textColor?: string, 
      backgroundColor?: string 
    }
  }): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.update({
        userId: this.userId,
        id: labelId,
        requestBody: updates
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update label ${labelId}: ${error}`);
    }
  }
  
  async deleteLabel(labelId: string): Promise<void> {
    try {
      await this.gmail.users.labels.delete({
        userId: this.userId,
        id: labelId
      });
    } catch (error) {
      throw new Error(`Failed to delete label ${labelId}: ${error}`);
    }
  }
  
  async modifyMessageLabels(messageId: string, addLabelIds?: string[], removeLabelIds?: string[]): Promise<gmail_v1.Schema$Message> {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: this.userId,
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to modify labels for message ${messageId}: ${error}`);
    }
  }
  
  // Convenience methods for common label operations
  
  async markAsRead(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, [], ['UNREAD']);
  }
  
  async markAsUnread(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['UNREAD'], []);
  }
  
  async archiveMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, [], ['INBOX']);
  }
  
  async unarchiveMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['INBOX'], []);
  }
  
  async trashMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['TRASH'], ['INBOX']);
  }
} 