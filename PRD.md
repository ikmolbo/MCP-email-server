# Gmail Thread Reply Implementation PRD

## Overview
Currently, when replying to an email through the MCP server, a new email is created instead of being added to the existing thread. This PRD outlines the implementation of proper thread reply functionality using the Gmail API.

## Requirements

### Functional Requirements
1. When replying to an email, the response should:
   - Appear in the same thread as the original email
   - Show as a reply in Gmail's conversation view
   - Maintain the email chain context
   - Include proper "Re:" subject formatting

### Technical Requirements
1. Message Headers:
   - Add `References` header containing the message IDs of all previous messages in the thread
   - Add `In-Reply-To` header containing the message ID of the immediate parent message
   - Maintain the same subject line with proper "Re:" prefix
   - Include the `threadId` in the message metadata

2. API Integration:
   - Use Gmail API's messages.send endpoint
   - Properly encode the message in base64url format
   - Handle RFC 2822 compliance for email headers

## Implementation Plan

### Phase 1: Message Retrieval
1. Implement function to get original message details:
   - Get message ID
   - Get thread ID
   - Get References headers
   - Get subject

### Phase 2: Reply Construction
1. Create message builder with proper headers:
   ```javascript
   const headers = {
     'References': '<original-message-id>',
     'In-Reply-To': '<immediate-parent-message-id>',
     'Subject': 'Re: Original Subject',
     'threadId': 'thread-id-value'
   }
   ```

2. Implement message encoding:
   - Construct RFC 2822 compliant message
   - Base64url encode the message

### Phase 3: Send Integration
1. Modify existing send_email function to:
   - Accept optional threadId parameter
   - Include thread-specific headers when threadId is provided
   - Use messages.send with thread metadata

## Testing Plan
1. Test Scenarios:
   - Reply to single email
   - Reply in existing thread with multiple messages
   - Reply with attachments
   - Reply with HTML content
   - Reply with plain text content

2. Verification:
   - Messages appear in correct thread
   - Gmail conversation view shows proper threading
   - Headers are correctly set
   - Subject formatting is correct

