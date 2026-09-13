# Capability: AI Mentorship

## Overview
Multi-persona AI mentors provide context-aware financial advice based on user data.

## Requirements

### Requirement: Multi-Persona AI
The system SHALL provide distinct AI mentor personalities (e.g., "Long-Term Thinker", "Risk Guardian").

#### Scenario: Mentor selection
- **GIVEN** user opens Mentors page
- **WHEN** user selects a specific mentor
- **THEN** subsequent advice reflects that mentor's archetype and style

### Requirement: Context-Aware Advice
The system SHALL analyze user's current financial data before providing insights.

#### Scenario: Personalized analysis
- **GIVEN** user has high credit card debt
- **WHEN** user asks mentor for advice
- **THEN** mentor acknowledges the debt situation and provides relevant guidance

### Requirement: Chat Interface
The system SHALL provide a conversational UI for querying financial wisdom.

#### Scenario: Chat interaction
- **GIVEN** user is viewing a mentor
- **WHEN** user types a question
- **THEN** mentor responds with relevant financial advice

### Requirement: Wisdom Banner
The system SHALL display rotating quotes and insights on the dashboard.

#### Scenario: Quote display
- **GIVEN** user views dashboard
- **WHEN** Wisdom widget is enabled
- **THEN** a relevant financial quote or insight is displayed

### Context Injection Flow

```text
                                           ┌─────────────────────────┐
    [ 👤 User Query ] ───────────────────▶ │ 🧠 Prompt Engineering   │
         "Should I pay off debt?"          │                         │
                                           │  + Identity: "Guardian" │
    [ 📊 User Data ] ────────────────────▶ │  + Context:  "High Debt"│
      (Assets, Liab, Net Worth)            │                         │
                                           └────────────┬────────────┘
                                                        │
                                                        ▼
    [ 💬 Response ] ◀────────────────────────── [ 🤖 Local LLM (LM Studio / Ollama) ]
    "Considering your $50k debt..."            Zero cloud data leak
```

## Technical Implementation

### Components
Codebase: `src/features/mentors`

- **Components**:
  - `ChatInterface.tsx`: Handles message list, input, and "Try saying..." suggestions.
  - `MentorList.tsx`: Sidebar for selecting active mentors (Standard & Custom).
  - `AddMentorModal.tsx`: Form for generating/creating new custom mentors via Local LLM.
  - `MentorsPage.tsx`: Container component managing state (chat history, selected mentors, multi-persona consensus).

- **Data**:
  - `data/mentors.tsx`: Defines `STATIC_MENTORS` with Lucide icons.
  - `src/lib/api/localLlm.ts`: Unified Local LLM client with support for reasoning models, token allocation (2048 tokens), and timeout resilience.

### Integration
- **Local AI Service**: `/api/mentor` endpoint routes queries strictly through `queryLocalLlm` to localhost (`1234` or `11434`).
- **Context**: `userContext` (Net Worth, Assets, Liabilities, Preferred Currency) is injected into every prompt locally.
- **Reasoning Models**: Automatically handles `reasoning_content` produced by thinking models (e.g. Qwen 2.5/3.8, DeepSeek R1).
- **JSON Safety**: React JSX icons are stripped from mentor objects prior to serialization.
- **Offline Fallback**: When the Local LLM runner is unstarted, grounded philosophical wisdom is delivered immediately with setup guidance tips.
