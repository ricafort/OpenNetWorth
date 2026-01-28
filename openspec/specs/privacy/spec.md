# Capability: Privacy

## Overview
Privacy features including stealth mode and data protection.

## Requirements

### Requirement: Stealth Mode
The system SHALL provide a theme that hides all sensitive financial values.

#### Scenario: Stealth activation
- **GIVEN** user selects "Stealth" theme
- **WHEN** theme is applied
- **THEN** all financial values match background color (invisible)

### Requirement: Privacy Blur
The system SHALL provide a toggle to temporarily blur values.

#### Scenario: Blur toggle
- **GIVEN** user clicks privacy blur button
- **WHEN** blur is enabled
- **THEN** all values display with 4px blur filter

### Requirement: Data Export
The system SHALL allow users to export all their data.

#### Scenario: Full export
- **GIVEN** user clicks "Export Data"
- **WHEN** export is triggered
- **THEN** JSON file downloads with all assets, liabilities, goals, history

### Requirement: Data Deletion
The system SHALL allow users to delete all their data.

#### Scenario: Full deletion
- **GIVEN** user confirms data deletion
- **WHEN** deletion is confirmed
- **THEN** all user data is removed from localStorage and database

### Requirement: Row-Level Security
The system SHALL ensure data isolation via Supabase RLS.

#### Scenario: Cross-user protection
- **GIVEN** user A is authenticated
- **WHEN** user A queries data
- **THEN** only user A's data is returned (not user B's)
