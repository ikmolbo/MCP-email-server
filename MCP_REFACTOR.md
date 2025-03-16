# Plan de Refactorizare MCP Email Server

## Obiective
1. Reorganizarea codului conform arhitecturii MCP recomandate
2. Implementarea unui sistem robust de prompt-uri pentru email
3. Îmbunătățirea funcționalității de reply pentru emailuri
4. Adăugarea de validări și handling pentru cazuri edge

## Structura Nouă
```
src/
├── index.ts                 # Entry point și server setup
├── server.ts               # Implementare server MCP
├── client-wrapper.ts       # Gmail API client wrapper
├── tool-handler.ts         # Tool registration și routing
├── prompt-handler.ts       # Management prompt-uri
├── version.ts              # Managementul versiunii
├── tools/                  # Implementări tool-uri pe domenii
│   ├── email-tools.ts      # Tool-uri pentru operații cu email
│   └── auth-tools.ts       # Tool-uri pentru autentificare
└── utils/                  # Utilitare comune
    ├── validation.ts       # Validări
    ├── error-utils.ts      # Handling erori
    └── email-utils.ts      # Utilitare pentru procesare email
```

## Pași de Implementare

### 1. Restructurare Cod
- Mutare cod existent în noua structură de directoare
- Separare logică în module distincte
- Implementare clase wrapper pentru Gmail API

### 2. Sistem de Prompt-uri
Implementare prompt-uri pentru:
- Citire email (cu extragere thread ID și adresă destinație)
- Trimitere email nou
- Răspuns la email (cu păstrare context thread și adresă)

### 3. Tool-uri Îmbunătățite
#### Email Tools
- `email_read`: Cu extragere automată thread ID și adresă destinație
- `email_send`: Cu suport pentru trimitere de la adresa corectă
- `email_reply`: Specializat pentru răspunsuri în thread

#### Auth Tools
- `auth_check`: Verificare stare autentificare
- `auth_refresh`: Reînnoire token-uri

### 4. Validări și Error Handling
- Validare parametri input
- Handling erori Gmail API
- Logging și monitorizare

### 5. Prompt Guidelines
```typescript
const emailPrompts = {
  read_email: {
    name: "read_email",
    description: "Read an email and extract all necessary context",
    template: `
Given an email message, please extract and provide:
1. Subject
2. From address
3. To address(es)
4. Thread ID
5. Message ID
6. Content
7. Attachments (if any)

This information will be used for:
- Understanding the email context
- Enabling proper replies in the same thread
- Ensuring replies are sent from the correct address
    `,
    parameters: ["messageId"],
    required_output: ["threadId", "toAddress", "messageId", "subject", "content"]
  },
  
  send_reply: {
    name: "send_reply",
    description: "Send a reply in an email thread",
    template: `
To properly reply to an email, we need:
1. Original message Thread ID
2. Original recipient address (to use as sender)
3. Subject (prefixed with Re:)
4. Content
5. References to maintain thread

Please ensure all these elements are provided to maintain email thread context.
    `,
    parameters: ["threadId", "fromAddress", "subject", "content"],
    required_output: ["messageId", "threadId"]
  }
}
```

## Testing
1. Verificare funcționalitate existentă
2. Testare cazuri edge
3. Validare prompt-uri
4. Verificare handling erori

## Changelog Updates
- Adăugare versiune nouă cu refactorizare
- Documentare schimbări arhitectură
- Listare îmbunătățiri funcționalitate

## Prompts pentru Testare
1. "Read the latest email from my inbox"
2. "Reply to the email about project updates"
3. "Send a new email to team@company.com"
4. "Forward the last email to another address"

## Securitate
- Validare credențiale
- Protecție date sensibile
- Logging securizat

## Documentație
- README actualizat
- Exemple de utilizare
- Ghid de configurare
- Documentație API 