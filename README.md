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
└── tools/                   # Tool implementations by domain
    ├── email-read-tools.ts  # Tools for reading emails
    ├── email-send-tools.ts  # Tools for sending emails
    └── email-search-tools.ts # Tools for searching and filtering emails
```

### Core Components

- **index.ts**: Entry point for the application, handles authentication and server initialization
- **server.ts**: Implements the MCP server functionality, registers handlers for tools and prompts
- **client-wrapper.ts**: Wraps Gmail API functionality, implements category support and message transformation
- **tool-handler.ts**: Routes tool requests to appropriate handlers and formats responses
- **prompt-handler.ts**: Manages templates and examples for common Gmail operations
- **utils.ts**: Provides utility functions for date formatting, email creation, and content extraction
- **tools/**: Contains domain-specific implementations for email operations

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
- `maxResults`: Maximum number of results to return (default: 10)
- `query`: Additional Gmail search query
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)

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
- `maxResults`: Maximum number of results to return (default: 10)
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)

## Example Prompts

- "Send an email to john@example.com with subject 'Meeting Tomorrow'"
- "Get my emails from the last 24 hours"
- "Search for emails from jane@example.com"
- "Find unread emails in my Primary category from yesterday"
- "Show me promotional emails containing 'discount' received today"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
