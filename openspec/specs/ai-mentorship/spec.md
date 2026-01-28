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
