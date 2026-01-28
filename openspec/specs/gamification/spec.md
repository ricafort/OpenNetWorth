# Capability: Gamification

## Overview
Achievement badges and onboarding to gamify the financial journey.

## Requirements

### Requirement: Achievement Badges
The system SHALL award badges for financial milestones.

#### Scenario: Positive net worth badge
- **GIVEN** user's net worth becomes positive
- **WHEN** dashboard recalculates
- **THEN** "Positive Net Worth" badge is awarded

#### Scenario: Debt free badge
- **GIVEN** user pays off all liabilities
- **WHEN** total liabilities reach $0
- **THEN** "Debt Free" badge is awarded

### Requirement: Badge Persistence
The system SHALL store earned badges in the database per user.

#### Scenario: Badge saved
- **GIVEN** user earns a badge
- **WHEN** badge is awarded
- **THEN** badge is saved to `user_badges` table

### Requirement: Onboarding Tour
The system SHALL provide an interactive guide for new users.

#### Scenario: First visit tour
- **GIVEN** user visits dashboard for first time
- **WHEN** onboarding has not been completed
- **THEN** interactive tour highlights key features

### Requirement: Template Badge Visibility
The system SHALL allow anonymous users to view template profile badges.

#### Scenario: Demo mode badges
- **GIVEN** user is viewing a demo profile
- **WHEN** badges widget is visible
- **THEN** template's earned badges are displayed
