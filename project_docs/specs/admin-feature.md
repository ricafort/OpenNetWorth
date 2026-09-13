# Design Document: Admin Managed Demo Profiles

## 1. Overview
This document outlines the architecture for a dynamic "Demo Mode" where an Admin can manage "Template Profiles" for different countries and currencies. This replaces hardcoded JSON data with database-backed templates.

## 2. Terminology
- **Admin**: A user with elevated privileges (`role='admin'`).
- **Template Profile**: A specific User Profile in the database marked as a template (`is_template=true`). It represents a persona (e.g., "UK Investor", "JP Student").
- **Demo Context**: The state when the application is displaying data from a Template Profile instead of the logged-in user's real data.

## 3. Database Schema Changes
We need to enhance the `profiles` table in Supabase.

### 3.1 `profiles` Table Modifications
```sql
ALTER TABLE public.profiles 
ADD COLUMN is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN role TEXT DEFAULT 'user', -- 'admin' | 'user'
ADD COLUMN country_code TEXT,        -- e.g., 'US', 'GB', 'JP'
ADD COLUMN currency_code TEXT;       -- e.g., 'USD', 'GBP', 'JPY'
```

### 3.2 Security Policies (RLS)
- **Admins**: Can CRUD all rows in `profiles`, `assets`, etc.
- **Public/Anonymous**: Can READ (SELECT) rows where `profiles.is_template = true`.

## 4. Admin Feature Workflow

### 4.1 Dashboard (`/admin`)
A new protected route for Admins.
- **List Templates**: View all existing templates (e.g., "UK Demo", "US Demo").
- **Create Template**: Form to add a new profile with a specific currency/country.
- **Edit Data**: A button that logs the Admin into the *context* of that template.

### 4.2 "Edit Data" Mode
When an Admin edits a template:
1.  The app sets a `SimulatedProfileContext` to the Template's ID.
2.  The Admin navigates the regular user dashboard (`/dashboard`, `/assets`).
3.  Any item added (Asset, Liability) is saved with `user_id = template_id`.
4.  This ensures the demo data structure is always 100% consistent with the real app.

## 5. User Experience (The "Demo")
for new visitors:
1.  **Landing Page**: "Explore OpenNetWorth".
2.  **Region Selector**: User picks "United Kingdom (GBP)".
3.  **App Load**: 
    - Fetches the "UK Demo" profile.
    - Populates the Redux/Zustand store with that profile's Assets, Liabilities, etc.
    - User sees "£" symbols and UK-specific assets.

## 6. Implementation Steps
1.  **Schema**: Run migration to add columns.
2.  **Auth**: Create an Admin Guard component.
3.  **Context**: Create `DemoDataProvider` to handle fetching template data.
4.  **Admin UI**: Build the `/admin` page.
