import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosResponse } from 'gaxios';

export interface EmailData {
  threadId?: string;
  messageId: string;
  headers: gmail_v1.Schema$MessagePartHeader[];
  subject: string;
  from: string;
  to: string[];
  content: string;
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

  async getMessage(messageId: string): Promise<EmailData> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: this.userId,
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      return {
        threadId: message.threadId || undefined,
        messageId: message.id || messageId,
        headers: headers,
        subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '',
        from: headers.find(h => h.name?.toLowerCase() === 'from')?.value || '',
        to: (headers.find(h => h.name?.toLowerCase() === 'to')?.value || '').split(',').map(e => e.trim()),
        content: this.extractContent(message),
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
    const headers = [
      `To: ${options.to.join(', ')}`,
      `Subject: ${options.subject}`,
      options.from ? `From: ${options.from}` : '',
      options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
      options.references?.length ? `References: ${options.references.join(' ')}` : '',
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    ].filter(Boolean).join('\r\n');

    const email = `${headers}\r\n\r\n${options.content}`;
    return Buffer.from(email).toString('base64url');
  }
} 