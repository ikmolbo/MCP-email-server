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

## [0.2.0] - 2023-07-14

### Added
- Enhanced date filtering with new `timeFilter` parameter:
  - `today` - Calendar date (00:00 to 23:59)
  - `yesterday` - Previous calendar date
  - `last24h` - Rolling 24-hour window
- Automatic conversion of `is:unread` to `label:unread` for better Gmail API compatibility
- New utility functions for date handling:
  - `getTodayDateQuery()` - Gets current date in YYYY/MM/DD format
  - `getTomorrowDateQuery()` - Gets tomorrow's date
  - `getYesterdayDateQuery()` - Gets yesterday's date
  - `getTodayQuery()` - Generates a query for today's calendar date
  - `getYesterdayQuery()` - Generates a query for yesterday's calendar date
  - `ensureCorrectUnreadSyntax()` - Converts is:unread to label:unread
- Enhanced template prompts with clear examples for:
  - Retrieving unread emails from specific categories
  - Filtering emails by calendar date vs time window
  - Finding emails that need replies
  - Using common Gmail search operators

### Improved
- Clearer distinction between calendar dates ("today") vs time windows ("last 24h") 
- More informative response messages that include:
  - Date ranges being searched
  - Unread status in the results
  - Category information
- Better handling of default cases (defaults to today's calendar date if no filter specified)
- More comprehensive templates with common search patterns
- Automatic detection of date filters in queries

### Fixed
- Fixed issue with "today" being incorrectly interpreted as the last 24 hours
- Fixed date formatting in Gmail queries to use YYYY/MM/DD format
- Fixed improper usage of 'is:unread' which was causing search misses
- Fixed support for combining time filters with category filters

## [0.1.0] - 2024-03-16

### Added
- Initial implementation of MCP server for email
- Integration with Gmail API
- Basic functionality for sending and reading emails
- OAuth authentication with Gmail

## v0.2.0 (2024-03-17)

### Added
- Support for results pagination in email listing functions:
  - Added `pageToken` parameter to `get_recent_emails` and `search_emails` tools
  - Implemented handling for `nextPageToken` in responses
  - Added information about total estimated results
  - Limited to maximum 500 results per page as per Gmail API restrictions

- Gmail Category System Support:
  - Added `category` parameter to `get_recent_emails` and `search_emails` tools
  - Implemented filtering by Gmail categories: Primary, Social, Promotions, Updates, Forums
  - Improved search queries for category filtering
  - Fixed implementation to use proper Gmail API syntax for categories

- Time Filter Enhancements:
  - Added `timeFilter` parameter with support for "today", "yesterday", and "last24h"
  - Improved date query construction for better search results
  - Enhanced response messages to include clear time descriptions with actual dates

- Code Organization and Modularity:
  - Refactored code to use a modular directory structure
  - Created specialized tool modules for email operations: reading, sending, searching
  - Improved server initialization and configuration
  - Separated utility functions into dedicated modules

### Fixed
- Corrected category search handling for Gmail's Primary category
- Fixed issues with "unread" search queries by automatically converting `is:unread` to `label:unread`
- Enhanced error handling in Gmail API interactions

### Improved
- Enhanced response formatting with more context about search parameters
- Better query construction for complex search operations
- Improved documentation in code comments
- Updated tool descriptions with more accurate usage information