# Email MCP Server

An MCP server for Gmail operations including sending emails and retrieving recent messages.

## Setup

1. Create a Google Cloud Project and enable the Gmail API:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Gmail API
   - Create OAuth credentials (Desktop application)
   - Download the credentials JSON file as `gcp-oauth.keys.json`

2. Install dependencies:
   ```
   npm install
   ```

3. Build the server:
   ```
   npm run build
   ```

4. Authenticate with Gmail:
   ```
   npm run auth
   ```

5. Install the server globally:
   ```
   npm link
   ```

## Usage with Claude Desktop

Claude Code:

claude mcp add email-server -- /path/to/email-server/build/index.js

## Available Tools

- `send_email` - Send an email
  - Required parameters:
    - `to` - Array of recipient email addresses
    - `subject` - Email subject
    - `body` - Email body content
  - Optional parameters:
    - `cc` - Array of CC recipients
    - `bcc` - Array of BCC recipients

- `get_recent_emails` - Get emails from the last X hours
  - Optional parameters:
    - `hours` - Number of hours to look back (default: 24)
    - `maxResults` - Maximum number of results to return (default: 10)
    - `query` - Additional Gmail search query

- `read_email` - Read a specific email by ID
  - Required parameters:
    - `messageId` - ID of the email message to retrieve

- `search_emails` - Search for emails using Gmail query syntax
  - Required parameters:
    - `query` - Gmail search query (e.g., 'from:example@gmail.com')
  - Optional parameters:
    - `maxResults` - Maximum number of results to return (default: 10)

## Example Prompts

- "Send an email to john@example.com with subject 'Meeting Tomorrow'"
- "Get my emails from the last 24 hours"
- "Search for emails from jane@example.com" 


EXAMPLE of an MCP server local config file for Claude Desktop from another MCP server:

```
{
    "mcpServers": {
      "asana-local": {
        "command": "node",
        "args": ["/Users/cristi/Downloads/CODING/MCP Asana/mcp-server-asana/dist/index.js"],
        "env": {
          "ASANA_ACCESS_TOKEN": "token"
        }
      }
    }
  }
```

Currrent folder location: /Users/cristi/Downloads/CODING/MCP-email-server