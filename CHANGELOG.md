# Changelog

## [0.4.0] - 2024-03-16

### Added
- Refactorizare completă a arhitecturii conform standardelor MCP
- Implementare sistem de prompt-uri pentru email
- Separare cod în module distincte pentru mai bună mentenanță
- Adăugare validări și handling erori îmbunătățit
- Documentație extinsă pentru dezvoltatori

### Changed
- Restructurare cod în directoare specializate
- Îmbunătățire handling pentru thread-uri și adrese de reply
- Actualizare tipuri și interfețe pentru mai bună type safety
- Separare logică de business în module dedicate

### Fixed
- Corectare handling pentru adrese de reply în thread-uri
- Îmbunătățire validare parametri pentru tool-uri
- Corectare erori de tipuri în implementarea tool-urilor

## [0.3.0] - 2024-03-16

### Added
- Funcționalitate pentru reply de la adresa corectă
- Suport pentru determinarea adresei originale de destinație
- Integrare cu Gmail Send-As aliases
- Selecție automată a adresei corecte pentru reply
- Suport pentru header From în crearea email-urilor

### Changed
- Modificare funcție createEmailMessage pentru suport From header
- Adăugare funcție getReplyToAddress

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
- Implementare inițială server MCP pentru email
- Integrare cu Gmail API
- Funcționalitate de bază pentru trimitere și citire email-uri
- Autentificare OAuth cu Gmail 