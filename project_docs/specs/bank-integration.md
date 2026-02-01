# Capability: Bank Integration

## Overview
Plaid-powered bank account linking for automatic asset/liability syncing.

## Requirements

### Plaid Link Flow

```text
  [ 👤 User ]                       [ 🖥️ Client (React) ]             [ ☁️ Server (Next.js) ]
       │                                     │                                  │
       │ (1) Click "Connect"                 │                                  │
       ▼                                     │                                  │
  [ 🏦 Plaid Modal ] ◀───────────────────────┘                                  │
       │                                                                        │
       │ (2) User Logins to Bank                                                │
       ▼                                                                        │
  [ 🎫 Public Token ] ───────────────────────▶ (3) Send Public Token ──────────▶│
                                                                                │ (4) Exchange
                                                                                ▼
                                                                        [ 🔑 Access Token ]
                                                                                │
  [ 💰 Bank Data ] ◀────────────────────────────────────────────────────────── (5) Sync
```

### Requirement: Plaid Link
The system SHALL provide a secure Plaid Link flow for connecting bank accounts.

#### Scenario: Successful connection
- **GIVEN** user clicks "Connect Bank"
- **WHEN** user completes Plaid authentication
- **THEN** bank accounts are linked and ready for sync

### Requirement: Account Sync
The system SHALL fetch account balances from connected banks.

#### Scenario: Balance update
- **GIVEN** bank account is connected
- **WHEN** sync is triggered
- **THEN** asset values update to match bank balances

### Requirement: Sandbox Mode
The system SHALL use mock/sandbox mode when Plaid credentials are not configured.

#### Scenario: Missing credentials
- **GIVEN** PLAID_* environment variables are not set
- **WHEN** user attempts bank connection
- **THEN** system operates in sandbox/demo mode

### Requirement: Token Exchange
The system SHALL securely exchange Plaid public tokens for access tokens server-side.

#### Scenario: Token exchange
- **GIVEN** user completes Plaid Link
- **WHEN** public token is received
- **THEN** server exchanges for access token without exposing to client
