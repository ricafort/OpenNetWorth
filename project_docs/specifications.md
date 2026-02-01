# System Specifications

This document consolidates the functional and technical specifications for ClearWorth features.

> [!NOTE]
> This is a living document. Updates to features should be reflected here.

---

## 🏗️ 1. Architecture & Admin

### Admin Managed Demo Profiles
**Goal**: Allow Admins to manage "Template Profiles" (e.g., "UK Investor", "JP Student") via the UI, replacing hardcoded JSON.

#### Schema Changes
- **`profiles` Table**: Added `is_template`, `role`, `country_code`, `currency_code`.
- **Security**: Admins can CRUD all templates. Public users can READ templates.

#### Workflow
1.  **Dashboard (`/admin`)**: Admins view/edit templates.
2.  **Edit Mode**: Admins "sign in" as the template user to modify Assets/Liabilities using the real UI.
3.  **User Experience**: New users select a region (e.g., "United Kingdom"), and the app loads the "UK Demo" profile's data into the Redux/Zustand store.

---

## 🔐 2. Authentication

### Google Authentication
**Goal**: Enable "Sign in with Google" via Supabase Auth (OAuth 2.0).

#### Implementation
- **Provider**: Google Identity via Supabase.
- **Callback**: `src/app/auth/callback/route.ts` handles the PKCE code exchange.
- **Triggers**: `handle_new_user` Postgres trigger automatically creates a `profile` row upon signup.

#### Requirements
- **Prerequisites**: Google Cloud Console project with OAuth Consent Screen enabled.
- **Environment**: `GEMINI_API_KEY` is separate, but `NEXT_PUBLIC_SUPABASE_URL` is required for Auth.

---

## 🏦 3. Bank Integration

### Plaid Integration
**Goal**: Securely link bank accounts to sync Asset/Liability balances automatically.

#### Flow
1.  **User** clicks "Connect Bank".
2.  **Plaid Link** modal opens (client-side).
3.  **Public Token** is returned to client upon success.
4.  **Server Action** exchanges Public Token for Access Token (never exposed to client).
5.  **Sync**: Background job updates Asset balances.

#### Requirements
- **Sandbox Mode**: If `PLAID_CLIENT_ID` is missing, the system MUST fallback to a mock/demo mode.
- **Security**: Access Tokens are stored securely in the database (encrypted at rest by Supabase).

---

## 📊 4. Dashboard & Core Logic

### Net Worth Engine
- **Logic**: `Total Assets - Total Liabilities`.
- **Display**: All values converted to User's `base_currency`.

### Widgets
- **Grid Layout**: Drag-and-drop support via `react-grid-layout`.
- **Growth Engine**: Calculates Portfolio Allocation and projected Dividends.
- **Wealth Momentum**: Velocity score based on `(Income - Expenses) / Net Worth`.

### Multi-Currency
- **Input**: Forms accept any currency (e.g., USD asset in a GBP profile).
- **Storage**: Stored in original currency + exchange rate.
- **Display**: Normalized to Base Currency on the dashboard.

---

## 🧠 5. AI Mentorship ("Wisdom")

### Core Features
1.  **Multi-Persona**: distinct system prompts (e.g., "Risk Guardian" vs "Tycoon").
2.  **RAG Context**: Inject User's *current* Net Worth, Asset Allocation, and Debt Ratio into the LLM prompt.
3.  **Chat Interface**: Conversational UI with history.

### Technical Flow
- **User Query**: "Should I buy a boat?"
- **System Injection**: "User has $5k savings and $50k debt."
- **LLM Response**: "No. Pay off your debt first."

---

## 🎮 6. Gamification

### The "Badge Cycle"
1.  **Action**: User updates data (pays off debt).
2.  **Trigger**: Database trigger (`on_liab_change`) fires.
3.  **Logic**: Checks condition (`liabilities == 0`).
4.  **Reward**: Inserts row into `user_badges`.
5.  **Feedback**: UI shows "Debt Free Badge Unlocked!".

### Schema (`user_badges`)
- Keys: `user_id`, `badge_id`.
- Triggers: SQL functions handle the logic to ensure consistency.

---

## 🛡️ 7. Privacy & Security

### Stealth Mode
- **Feature**: A Theme/CSS mode where `color: transparent; text-shadow: 0 0 5px rgba(0,0,0,0.5);`.
- **Goal**: Use in public spaces without revealing specific numbers.

### Privacy Blur
- **Feature**: Toggle button to apply `filter: blur(4px)` to all number fields.

### Data Protection
- **Row Level Security (RLS)**: Postgres policies enforce `auth.uid() == user_id`.
- **Export/Delete**: GDPR compliance features allowing full JSON export or account wipe.
