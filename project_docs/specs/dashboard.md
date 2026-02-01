# Capability: Dashboard

## Overview
The main financial dashboard displays net worth, assets, liabilities, and interactive widgets.

## Requirements

### Requirement: Net Worth Calculation
The system SHALL calculate net worth as Total Assets minus Total Liabilities.

#### Scenario: Basic calculation
- **GIVEN** user has assets totaling $100,000 and liabilities totaling $50,000
- **WHEN** dashboard loads
- **THEN** net worth displays as $50,000

### Requirement: Interactive Widget Grid
The system SHALL provide a drag-and-drop grid layout for customizing widget placement.

#### Scenario: Widget repositioning
- **GIVEN** user is in edit mode
- **WHEN** user drags a widget to a new position
- **THEN** the widget moves to the new position and layout is saved

### Requirement: Multi-Currency Support
The system SHALL convert all values to the user's base currency for display.

#### Scenario: Currency conversion
- **GIVEN** user has base currency set to EUR
- **WHEN** an asset is stored in USD
- **THEN** the asset value displays in EUR using current exchange rates

### Requirement: Growth Engine
The system SHALL analyze portfolio performance, allocation, and projected dividend income.

#### Scenario: Portfolio analysis
- **GIVEN** user has investment assets
- **WHEN** viewing Growth Engine widget
- **THEN** system displays allocation breakdown and projected annual dividends

### Requirement: Wealth Momentum
The system SHALL calculate a financial velocity score based on income vs expenses.

#### Scenario: Momentum calculation
- **GIVEN** user has recurring income $5000/month and expenses $3000/month
- **WHEN** viewing Momentum widget
- **THEN** system displays positive momentum score with 40% savings rate
