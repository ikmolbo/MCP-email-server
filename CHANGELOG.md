# Changelog

## [0.3.0] - 2024-03-16

### Added
- Reply from correct email address functionality
  - Added support for determining the original recipient address
  - Added integration with Gmail's Send-As aliases
  - Automatically uses the correct email address when replying
  - Added From header support in email creation

### Changed
- Modified `createEmailMessage` function to support From header
- Added `getReplyToAddress` function to determine correct reply address
- Enhanced email sending response to show the used From address

## [0.2.0] - 2024-03-16

### Added
- Thread reply functionality
  - Added support for replying to existing email threads
  - Implemented proper email threading with Gmail conversation view
  - Added RFC 2822 compliant email headers for threading
  - Added `inReplyTo` and `threadId` parameters to send_email tool

### Changed
- Modified `createEmailMessage` function to support threading headers
  - Added `References` header support
  - Added `In-Reply-To` header support
  - Added thread ID support in message metadata

### Enhanced
- Enhanced `read_email` tool to include threading information
  - Now returns Message-ID and Thread ID
  - Improved email metadata display

## [0.1.0] - Initial Release

- Basic email functionality
  - Send emails
  - Read emails
  - Search emails
  - Get recent emails 