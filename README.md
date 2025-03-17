# Email MCP Server

A Model Context Protocol (MCP) server that enables Claude AI to interact with Gmail, providing capabilities for reading, searching, and sending emails through a standardized interface.

## Purpose

This server bridges Claude AI with Gmail API, allowing Claude to:
- Send emails and replies
- Search and retrieve emails with advanced filters
- Read email content and attachments
- Work with Gmail categories and labels

By implementing the Model Context Protocol, it gives Claude the ability to perform authenticated Gmail operations while maintaining security and privacy.

## Project Structure

```
src/
├── index.ts                 # Entry point and server initialization
├── server.ts                # MCP server implementation
├── client-wrapper.ts        # Gmail API client wrapper
├── tool-handler.ts          # Tool registration and request routing
├── prompt-handler.ts        # Prompt management
├── version.ts               # Version information
├── utils.ts                 # Shared utilities for dates, emails, etc.
├── timezone-utils.ts        # Timezone handling and configuration
└── tools/                   # Tool implementations by domain
    ├── email-read-tools.ts  # Tools for reading emails
    ├── email-send-tools.ts  # Tools for sending emails
    ├── email-search-tools.ts # Tools for searching and filtering emails
    ├── email-label-tools.ts # Tools for managing labels and message states
    └── timezone-tool.ts     # Tool for verifying timezone configuration
```

### Core Components

- **index.ts**: Entry point for the application, handles authentication and server initialization
- **server.ts**: Implements the MCP server functionality, registers handlers for tools and prompts
- **client-wrapper.ts**: Wraps Gmail API functionality, implements category support and message transformation
- **tool-handler.ts**: Routes tool requests to appropriate handlers and formats responses
- **prompt-handler.ts**: Manages templates and examples for common Gmail operations
- **utils.ts**: Provides utility functions for date formatting, email creation, and content extraction
- **timezone-utils.ts**: Handles timezone parsing, conversion, and formatting for consistent date handling
- **tools/**: Contains domain-specific implementations for email operations
  - **email-read-tools.ts**: Tools for reading emails and extracting content
  - **email-send-tools.ts**: Tools for composing and sending emails
  - **email-search-tools.ts**: Tools for finding emails with various filters
  - **email-label-tools.ts**: Tools for managing labels and message states (read/unread, archive/unarchive)
  - **timezone-tool.ts**: Tool for verifying timezone configuration and comparing time formats

## Configuration

The server supports the following configuration:

- `GMAIL_OAUTH_PATH`: Path to the OAuth keys file (default: `~/.email-mcp/gcp-oauth.keys.json`)
- `GMAIL_CREDENTIALS_PATH`: Path to the OAuth credentials file (default: `~/.email-mcp/credentials.json`)
- `TIME_ZONE`: Timezone configuration in format like 'GMT+2' or 'GMT-5' (default: 'GMT+0')

## Features

### Email Operations

- **Send Email**: Send new emails with support for CC, BCC, and attachments
- **Reply**: Reply to existing emails while maintaining thread context
- **Read Email**: Retrieve and display email content, headers, and attachments
- **Search Emails**: Search emails using Gmail's query syntax with enhanced features

### Advanced Functionality

- **Pagination**: Navigate through large result sets with `pageToken` support
- **Gmail Categories**: Filter by Gmail's categories (Primary, Social, Promotions, etc.)
- **Time Filtering**: Search by predefined time periods (today, yesterday, last 24h)
- **Unread Status**: Automatic handling of unread email filtering
- **HTML Content**: Process and display both HTML and plain text email content
- **Thread Context**: Maintain email threading for proper conversation context

### Label Management

- **Custom Labels**: Create, update, and delete custom labels
- **Label Visibility**: Control visibility of labels in message list and label list
- **Label Colors**: Configure text and background colors for visual organization
- **Message States**: Mark messages as read/unread, archive/unarchive messages
- **Trash Management**: Move messages to trash

### Time Zone Support

- **Display and Query Emails**: Display and query emails in the user's local time zone
- **Time Zone Verification**: Check the configured time zone and see current time adjustments
- **Configurable Offset**: Support for custom GMT offsets (GMT+2, GMT-5, etc.)
- **Consistent Formatting**: All timestamps displayed with the configured timezone
- **Date Calculations**: Search filters like "today" and "yesterday" properly adjusted for timezone

## Installation

### Prerequisites

- Node.js 16 or later
- npm
- A Google Cloud Project with Gmail API enabled
- OAuth credentials for Gmail API

### Setup Steps

1. **Create a Google Cloud Project and enable the Gmail API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Gmail API
   - Create OAuth credentials (Desktop application)
   - Download the credentials JSON file as `gcp-oauth.keys.json`

2. **Clone and Install**:
   ```bash
   git clone https://github.com/your-username/email-mcp-server.git
   cd email-mcp-server
   npm install
   ```

3. **Build the Server**:
   ```bash
   npm run build
   ```

4. **Authenticate with Gmail**:
   ```bash
   npm run auth
   ```
   This will open a browser window to authenticate with your Google account.

5. **Install Globally** (Optional):
   ```bash
   npm link
   ```

## Usage with Claude

### Claude in Cursor

Configure the MCP server in Cursor settings by adding the path to the server executable.

### Claude Desktop

Add the MCP server to Claude Desktop:

```bash
claude mcp add email-server -- /path/to/email-server/build/index.js
```

Example of a local config file for Claude Desktop:
```json
{
  "mcpServers": {
    "email-server": {
      "command": "node",
      "args": ["/path/to/email-server/build/index.js"]
    }
  }
}
```

## Available Tools

### Send Email
```
send_email
```
Send a new email message.

Parameters:
- `to`: Array of recipient email addresses (required)
- `subject`: Email subject (required)
- `body`: Email body content (required)
- `cc`: Array of CC recipients
- `bcc`: Array of BCC recipients
- `inReplyTo`: Message ID to reply to
- `threadId`: Thread ID to add the message to

### Get Recent Emails
```
get_recent_emails
```
Get recent emails with support for time filters, categories, and read status.

Parameters:
- `hours`: Number of hours to look back
- `maxResults`: Maximum number of results to return (default: 25)
- `query`: Additional Gmail search query
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)
- `autoFetchAll`: Automatically fetch all results (up to 100) without requiring pagination

### Read Email
```
read_email
```
Read a specific email by ID and extract its content.

Parameters:
- `messageId`: ID of the email message to retrieve (required)

### Search Emails
```
search_emails
```
Search for emails using Gmail query syntax with support for categories and time filters.

Parameters:
- `query`: Gmail search query (required)
- `maxResults`: Maximum number of results to return (default: 25)
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)
- `autoFetchAll`: Automatically fetch all results (up to 100) without requiring pagination

### Label Management Tools

#### List Labels
```
list_labels
```
List all labels in the user's mailbox.

Parameters: None

#### Get Label
```
get_label
```
Get details about a specific label.

Parameters:
- `labelId`: ID of the label to retrieve (required)

#### Create Label
```
create_label
```
Create a new label in the user's mailbox.

Parameters:
- `name`: Name of the label to create (required)
- `messageListVisibility`: Controls the label's visibility in the message list (`show` or `hide`)
- `labelListVisibility`: Controls the label's visibility in the label list (`labelShow`, `labelShowIfUnread`, or `labelHide`)
- `textColor`: Text color in hex format (e.g., #000000)
- `backgroundColor`: Background color in hex format (e.g., #ffffff)

#### Update Label
```
update_label
```
Update an existing label.

Parameters:
- `labelId`: ID of the label to update (required)
- `name`: New name for the label
- `messageListVisibility`: Controls the label's visibility in the message list (`show` or `hide`)
- `labelListVisibility`: Controls the label's visibility in the label list (`labelShow`, `labelShowIfUnread`, or `labelHide`)
- `textColor`: Text color in hex format (e.g., #000000)
- `backgroundColor`: Background color in hex format (e.g., #ffffff)

#### Delete Label
```
delete_label
```
Delete a label from the user's mailbox.

Parameters:
- `labelId`: ID of the label to delete (required)

#### Modify Labels
```
modify_labels
```
Add or remove labels from a message.

Parameters:
- `messageId`: ID of the message to modify (required)
- `addLabelIds`: Array of label IDs to add to the message
- `removeLabelIds`: Array of label IDs to remove from the message

### Message Management Tools

#### Mark as Read
```
mark_as_read
```
Mark a message as read.

Parameters:
- `messageId`: ID of the message to mark as read (required)

#### Mark as Unread
```
mark_as_unread
```
Mark a message as unread.

Parameters:
- `messageId`: ID of the message to mark as unread (required)

#### Archive Message
```
archive_message
```
Archive a message (remove from inbox).

Parameters:
- `messageId`: ID of the message to archive (required)

#### Unarchive Message
```
unarchive_message
```
Move a message back to inbox.

Parameters:
- `messageId`: ID of the message to move to inbox (required)

#### Trash Message
```
trash_message
```
Move a message to trash.

Parameters:
- `messageId`: ID of the message to move to trash (required)

## Example Prompts

- "Send an email to john@example.com with subject 'Meeting Tomorrow'"
- "Get my emails from the last 24 hours"
- "Search for emails from jane@example.com"
- "Find unread emails in my Primary category from yesterday"
- "Show me promotional emails containing 'discount' received today"
- "Create a new label called 'Project X' with blue background"
- "Show all my Gmail labels"
- "Mark this email as unread"
- "Archive all emails from this newsletter"
- "Move this email to my 'Important' label"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
