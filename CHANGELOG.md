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

## [0.2.0] - 2024-03-16

### Added
- Funcționalitate thread reply
- Suport pentru răspuns la email-uri existente
- Modificări createEmailMessage pentru suport threading headers
- Îmbunătățiri read_email pentru informații thread

### Changed
- Actualizare funcții pentru suport References și In-Reply-To
- Îmbunătățire extragere informații email

## [0.1.0] - 2024-03-16

### Added
- Implementare inițială server MCP pentru email
- Integrare cu Gmail API
- Funcționalitate de bază pentru trimitere și citire email-uri
- Autentificare OAuth cu Gmail 