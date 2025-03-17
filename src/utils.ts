import config from './config.js';

// Email message creation utility
export interface EmailOptions {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  from?: string;
}

/**
 * Codifică subiectul e-mailului conform RFC 2047 pentru a gestiona corect caracterele non-ASCII
 * @param subject Subiectul original al e-mailului
 * @returns Subiectul codificat pentru a fi compatibil cu headerele e-mailului
 */
export function encodeEmailSubject(subject: string): string {
  // Verifică dacă subiectul conține caractere non-ASCII
  if (!/^[\x00-\x7F]*$/.test(subject)) {
    // Codifică subiectul ca Base64 conform RFC 2047
    const encodedSubject = Buffer.from(subject).toString('base64');
    return `=?UTF-8?B?${encodedSubject}?=`;
  }
  // Returnează subiectul neschimbat dacă conține doar ASCII
  return subject;
}

export function createEmailMessage(args: EmailOptions) {
  const fromHeader = args.from ? `From: ${args.from}\r\n` : '';
  const toHeader = `To: ${args.to.join(', ')}\r\n`;
  const ccHeader = args.cc && args.cc.length > 0 ? `Cc: ${args.cc.join(', ')}\r\n` : '';
  const bccHeader = args.bcc && args.bcc.length > 0 ? `Bcc: ${args.bcc.join(', ')}\r\n` : '';
  const encodedSubject = encodeEmailSubject(args.subject);
  const subjectHeader = `Subject: ${encodedSubject}\r\n`;
  const contentType = 'Content-Type: text/plain; charset=utf-8\r\n';
  const inReplyToHeader = args.inReplyTo ? `In-Reply-To: <${args.inReplyTo}>\r\n` : '';
  const referencesHeader = args.references && args.references.length > 0 
    ? `References: ${args.references.map(ref => `<${ref}>`).join(' ')}\r\n` 
    : '';
  
  const message = 
    fromHeader +
    toHeader +
    ccHeader +
    bccHeader +
    subjectHeader +
    contentType +
    inReplyToHeader +
    referencesHeader +
    '\r\n' +
    args.body;
  
  return message;
}

// Gmail message part interface
export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

// Email content interface
export interface EmailContent {
  text: string;
  html: string;
}

// Email attachment interface
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Extract email content from MIME message parts
export function extractEmailContent(messagePart: GmailMessagePart): EmailContent {
  // Initialize containers for different content types
  let textContent = '';
  let htmlContent = '';

  // If the part has a body with data, process it based on MIME type
  if (messagePart.body && messagePart.body.data) {
    const content = Buffer.from(messagePart.body.data, 'base64').toString('utf8');

    // Store content based on its MIME type
    if (messagePart.mimeType === 'text/plain') {
      textContent = content;
    } else if (messagePart.mimeType === 'text/html') {
      htmlContent = content;
    }
  }

  // If the part has nested parts, recursively process them
  if (messagePart.parts && messagePart.parts.length > 0) {
    for (const part of messagePart.parts) {
      const { text, html } = extractEmailContent(part);
      if (text) textContent += text;
      if (html) htmlContent += html;
    }
  }

  // Return both plain text and HTML content
  return { text: textContent, html: htmlContent };
}

// Get attachment information from message parts
export function getAttachments(messagePart: GmailMessagePart): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  const processAttachmentParts = (part: GmailMessagePart) => {
    if (part.body && part.body.attachmentId) {
      const filename = part.filename || `attachment-${part.body.attachmentId}`;
      attachments.push({
        id: part.body.attachmentId,
        filename: filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0
      });
    }

    if (part.parts) {
      part.parts.forEach((subpart: GmailMessagePart) => processAttachmentParts(subpart));
    }
  };

  processAttachmentParts(messagePart);
  return attachments;
}

// Helper function to adjust a date to the configured timezone
export function adjustDateToTimeZone(date: Date): Date {
  const targetTz = config.timeZone;
  
  // If timezone is UTC, no adjustment needed
  if (targetTz === 'UTC') {
    return new Date(date);
  }
  
  try {
    // Format the date in the target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    // Get the date components in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    // Extract date parts
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    const hour = parts.find(part => part.type === 'hour')?.value;
    const minute = parts.find(part => part.type === 'minute')?.value;
    const second = parts.find(part => part.type === 'second')?.value;
    
    // Construct date string in ISO format
    const tzDate = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    return new Date(tzDate);
  } catch (error) {
    console.warn(`Error adjusting date to timezone ${targetTz}:`, error);
    return date; // Return original date if conversion fails
  }
}

// Helper function to format timestamp in a standardized way
export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Received: Unknown';
  
  try {
    const date = new Date(timestamp);
    const adjustedDate = adjustDateToTimeZone(date);
    // Format as ISO but replace T with space and keep only date and time
    return `Received: ${adjustedDate.toISOString().replace('T', ' ').substring(0, 19)}`;
  } catch (e) {
    // If parsing fails, return the raw timestamp
    return `Received: ${timestamp}`;
  }
}

// Function to get today's date in Gmail query format (YYYY/MM/DD)
export function getTodayDateQuery(): string {
  const today = new Date();
  const adjustedDate = adjustDateToTimeZone(today);
  return `${adjustedDate.getFullYear()}/${(adjustedDate.getMonth() + 1).toString().padStart(2, '0')}/${adjustedDate.getDate().toString().padStart(2, '0')}`;
}

// Function to get tomorrow's date in Gmail query format
export function getTomorrowDateQuery(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const adjustedDate = adjustDateToTimeZone(tomorrow);
  return `${adjustedDate.getFullYear()}/${(adjustedDate.getMonth() + 1).toString().padStart(2, '0')}/${adjustedDate.getDate().toString().padStart(2, '0')}`;
}

// Function to get yesterday's date in Gmail query format
export function getYesterdayDateQuery(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const adjustedDate = adjustDateToTimeZone(yesterday);
  return `${adjustedDate.getFullYear()}/${(adjustedDate.getMonth() + 1).toString().padStart(2, '0')}/${adjustedDate.getDate().toString().padStart(2, '0')}`;
}

// Format date for Gmail query
export function getDateQuery(hoursAgo: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  const adjustedDate = adjustDateToTimeZone(date);
  return adjustedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Function to create a Gmail query for emails received today
export function getTodayQuery(): string {
  return `after:${getTodayDateQuery()} before:${getTomorrowDateQuery()}`;
}

// Function to create a Gmail query for emails received yesterday
export function getYesterdayQuery(): string {
  return `after:${getYesterdayDateQuery()} before:${getTodayDateQuery()}`;
}

// Function to check if a query contains unread filter and ensure it uses label:unread
export function ensureCorrectUnreadSyntax(query: string): string {
  if (!query) return query;
  if (query.includes('is:unread')) {
    return query.replace(/is:unread/g, 'label:unread');
  }
  return query;
} 