// Email message creation utility
import { 
  timeZoneOffset, 
  adjustDateToTimeZone, 
  getCurrentDateInTimeZone, 
  formatDateToYYYYMMDD,
  formatTimestampWithOffset
} from './timezone-utils.js';

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
 * Encode the email subject according to RFC 2047 to handle non-ASCII characters correctly
 * @param subject The original email subject
 * @returns The encoded subject for compatibility with email headers
 */
export function encodeEmailSubject(subject: string): string {
  // Check if the subject contains non-ASCII characters
  if (!/^[\x00-\x7F]*$/.test(subject)) {
    // Encode the subject as Base64 according to RFC 2047
    const encodedSubject = Buffer.from(subject).toString('base64');
    return `=?UTF-8?B?${encodedSubject}?=`;
  }
  // Return the subject unchanged if it contains only ASCII characters
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

// Format date for Gmail query
export function getDateQuery(hoursAgo: number): string {
  const date = getCurrentDateInTimeZone();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Function to get today's date in Gmail query format (YYYY/MM/DD)
export function getTodayDateQuery(): string {
  const today = getCurrentDateInTimeZone();
  return formatDateToYYYYMMDD(today);
}

// Function to get tomorrow's date in Gmail query format
export function getTomorrowDateQuery(): string {
  const tomorrow = getCurrentDateInTimeZone();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return formatDateToYYYYMMDD(tomorrow);
}

// Function to get yesterday's date in Gmail query format
export function getYesterdayDateQuery(): string {
  const yesterday = getCurrentDateInTimeZone();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return formatDateToYYYYMMDD(yesterday);
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

// Helper function to format timestamp in a standardized way
export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Received: Unknown';
  
  try {
    // Folosim direct timestamp-ul care a fost deja formatat cu fusul orar
    return `Received: ${timestamp}`;
  } catch (e) {
    // If parsing fails, return the raw timestamp
    return `Received: ${timestamp}`;
  }
} 