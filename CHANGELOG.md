# Changelog

## [0.4.0] - 2024-03-16

### Added
- Complete refactoring of the architecture according to MCP standards
- Implementation of a prompt system for email
- Separation of code into distinct modules for better maintainability
- Added validations and improved error handling
- Extended documentation for developers

### Changed
- Restructured code into specialized directories
- Improved handling for threads and reply addresses
- Updated types and interfaces for better type safety
- Separated business logic into dedicated modules

### Fixed
- Corrected handling for reply addresses in threads
- Improved parameter validation for tools
- Fixed type errors in tool implementations

## [0.3.0] - 2024-03-16

### Added
- Reply from correct email address functionality
  - Added support for determining the original recipient address
  - Added integration with Gmail's Send-As aliases
  - Automatically uses the correct email address when replying
  - Added From header support in email creation

### Changed
- Modified createEmailMessage function to support From header
- Added getReplyToAddress function

## [0.2.0] - 2024-05-14

### Added
- Timestamp information for all email results (search_emails and get_recent_emails tools)
- Automatic pagination support with new `autoFetchAll` parameter (retrieves up to 100 emails)
- Improved documentation in prompts about the difference between Gmail categories and labels
- Category vs label clarification messages in API responses

### Changed
- Increased default result limit from 10 to 25 emails
- Enhanced pagination information with clearer guidance on how to retrieve more results
- Improved formatting of email results to include standardized timestamp format
- Updated documentation with examples for various search scenarios

### Fixed
- Email timestamp extraction and standardized format (YYYY-MM-DD HH:MM:SS)
- Confusion between labels and categories in documentation and examples
- Pagination handling to provide better guidance when more results are available

## [0.1.0] - 2024-05-01

### Initial Release
- Basic email reading capabilities
- Email search functionality
- Support for Gmail categories
- Email sending functionality
- Support for date filtering
- Basic pagination support