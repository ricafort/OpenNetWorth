# OpenNetWorth API Upgrade: Implementation Plan

Upgrading OpenNetWorth's market data and bank integration to a best-in-class, free-tier-friendly
architecture. This plan covers two tracks running in parallel: **Market Data** and **Banking**.

---

## Background & Motivation

### Why Replace Alpha Vantage?
Alpha Vantage's free tier was recently downgraded to **25 API calls per day** (from 500/day).
This means a user with 10 stock tickers in their portfolio could exhaust the daily quota
in 3 page loads — making the app appear broken to real users. The 15-second sequential delay
we added to `fetchAllPrices()` makes the experience feel slow and broken.

### Why Implement Basiq for Australia?
`factory.ts` already stubs the routing. When `countryCode === 'AU'` is passed, the code
warns and falls back to Plaid. **Plaid does not support Australian banks.** Any Australian
user who clicks "Connect Bank" in OpenNetWorth today will receive an error or an empty bank
list from Plaid's widget. This is a critical gap for our AU market.

---

## User Review Required

> [!IMPORTANT]
> **Basiq Developer Account Required.** Before the Basiq connector can be implemented, you
> must sign up at [https://dashboard.basiq.io](https://dashboard.basiq.io) and create a
> free Developer application to obtain `BASIQ_API_KEY`. The sandbox is free and provides
> mock data for all major Australian banks (CBA, NAB, Westpac, ANZ, Macquarie, ING).

> [!IMPORTANT]
> **Finnhub API Key Required.** Sign up at [https://finnhub.io](https://finnhub.io) for a
> free API key. Free tier gives **60 API calls/minute** — a massive upgrade over Alpha Vantage.

> [!WARNING]
> **yahoo-finance2 is an unofficial library.** It scrapes Yahoo Finance's internal API
> endpoints. It is widely used in the Node.js ecosystem (300k+ weekly downloads) but
> Yahoo could break it without notice. We will use it **only as a fallback** for ASX (`.AX`)
> tickers not available on Finnhub's free tier, with our 15-minute cache absorbing the risk.

> [!WARNING]
> **Alpha Vantage env vars will be removed** from `env.ts` and `env-example.txt`.
> The old `ALPHA_VANTAGE_KEY` and `NEXT_PUBLIC_ALPHA_VANTAGE_KEY` will be deprecated.
> Make sure to update any `.env.local` files.

---

## Open Questions

> [!IMPORTANT]
> **Q1: Crypto via CoinGecko — keep or also migrate?**
> The `fetchCryptoPrice()` function in `marketData.ts` already uses **CoinGecko** (free,
> no API key, generous limits). This is already a good solution. The plan is to **keep CoinGecko**
> for crypto as-is. Please confirm this is acceptable.

> [!IMPORTANT]
> **Q2: Basiq Staging vs. Production timeline?**
> The Basiq `sandbox` environment uses mock data (simulated CBA, NAB, etc. accounts with
> fictional balances). Moving to Basiq `production` requires completing their compliance
> verification process (similar to Plaid's Development→Production upgrade). Are we targeting
> Sandbox-only for this implementation, or do you want the production path scoped in?

---

## Architecture Overview

```
User's Country (from UserProfile.country_code)
         │
         ▼
  ┌─────────────────────────────────┐
  │        API Route Layer           │
  │  /api/bank/link                  │
  │  /api/bank/exchange              │
  └──────────────┬──────────────────┘
                 │  getBankConnector(country)
         ┌───────┴────────┐
         ▼                ▼
  PlaidConnector      BasiqConnector    ← NEW
  (US/UK/EU/CA)       (AU only)
         │                │
         ▼                ▼
  UniversalBankConnector interface (already defined in types.ts)
  - createLinkToken()
  - exchangePublicToken()
  - getAccounts()
  - getTransactions()


Stock Price Fetching (marketData.ts)
         │
         ▼
  isAustralian(ticker)?  (ends with .AX)
    ├─ YES → yahooFinanceProvider   ← NEW (yahoo-finance2)
    └─ NO  → finnhubProvider        ← NEW
         ↓
  Cache Layer (in-memory + localStorage, 15-min TTL) ← unchanged
         ↓
  Fallback: getMockPrice()  ← unchanged
```

---

## Proposed Changes

---

### Track 1: Market Data Service (`src/services/marketData.ts`)

#### [MODIFY] [marketData.ts](file:///d:/LocalVersions/OpenNetWorth/src/services/marketData.ts)

**Strategy:** Refactor into a provider-based model. The shared cache, `getMockPrice()`,
`fetchCryptoPrice()`, and `fetchAllPrices()` all remain. Only `fetchStockPrice()` changes.

**Changes:**
1. **Remove** all `ALPHA_VANTAGE_*` references and the 15-second sequential delay.
2. **Add** `fetchViaFinnhub(ticker)` — an internal function for US/global tickers.
3. **Add** `fetchViaYahooFinance(ticker)` — an internal function for `.AX` ASX tickers.
4. **Add** `isAustralianTicker(ticker)` helper — returns `true` if ticker ends with `.AX`.
5. **Update** `fetchStockPrice()` to route through these two new internal providers.
6. **Remove** the `shouldFetchStocks` API-key guard in `fetchAllPrices()` — Finnhub needs
   only a key, but Yahoo Finance needs no key at all, enabling AU stocks even without Finnhub.
7. **Update** the rate limiting: Since Finnhub allows 60/min, no artificial delays are needed.
   The existing 15-minute cache is sufficient protection.

**New Env Vars Required:**
- `FINNHUB_API_KEY` (server-side only — keep off `NEXT_PUBLIC_` prefix for security)

**Finnhub API Shape:**
```
GET https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY
Response: { c: 189.34, d: 1.23, dp: 0.65, h: 190.1, l: 188.0, o: 188.5, pc: 188.11 }
// c=current price, d=change, dp=change%, pc=previousClose
```

**Yahoo Finance API Shape (via `yahoo-finance2` npm package):**
```ts
import yahooFinance from 'yahoo-finance2';
const quote = await yahooFinance.quoteSummary('CBA.AX', { modules: ['price'] });
// quote.price.regularMarketPrice, .regularMarketChange, .regularMarketChangePercent
```

---

#### [NEW] `src/services/providers/finnhubProvider.ts`

A clean, single-responsibility module for the Finnhub integration.

```ts
// Why this exists: Isolates Finnhub-specific parsing so marketData.ts stays clean.
// Finnhub free tier: 60 req/min. No sequential delay needed.
export async function fetchViaFinnhub(ticker: string): Promise<PriceData | null>
```

---

#### [NEW] `src/services/providers/yahooFinanceProvider.ts`

A clean module for ASX tickers via the `yahoo-finance2` package.

```ts
// Why this exists: Finnhub's free tier doesn't cover international exchanges.
// yahoo-finance2 fills the gap for Australian (.AX) tickers at no cost.
export async function fetchViaYahooFinance(ticker: string): Promise<PriceData | null>
```

---

#### [NEW] `src/services/providers/index.ts`

Barrel export for all market data providers.

---

### Track 1 Environment Changes

#### [MODIFY] [env.ts](file:///d:/LocalVersions/OpenNetWorth/src/lib/env.ts)

```diff
-   NEXT_PUBLIC_ALPHA_VANTAGE_KEY: z.string().optional(),
+   FINNHUB_API_KEY: z.string().optional(),
```

#### [MODIFY] [env-example.txt](file:///d:/LocalVersions/OpenNetWorth/env-example.txt)

```diff
-# Alpha Vantage (Stock Prices)
-ALPHA_VANTAGE_KEY=your_stock_api_key
-NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_stock_api_key
+# Finnhub (Stock Prices — US/Global tickers)
+# Sign up free at https://finnhub.io — 60 API calls/minute
+FINNHUB_API_KEY=your_finnhub_api_key

+# Yahoo Finance (ASX .AX tickers) — No API key needed. Uses yahoo-finance2 npm package.
```

#### [MODIFY] [types.ts (assets)](file:///d:/LocalVersions/OpenNetWorth/src/features/assets/types.ts)

Update the JSDoc comment on `currentPrice` to remove the "Alpha Vantage" reference:
```diff
-   /** Live price from Alpha Vantage (fetched) */
+   /** Live price fetched from Finnhub (US/Global) or Yahoo Finance (ASX) */
```

---

### Track 2: Bank Integration — Basiq Connector

#### [NEW] `src/features/bank/basiqConnector.ts`

The full implementation of `UniversalBankConnector` for the Basiq v3 REST API.

**Basiq Auth Flow (Different from Plaid!):**
Basiq uses a **server-side OAuth2 client_credentials** flow, not Plaid Link's iframe widget.
The connection flow is:
1. **Server:** POST to Basiq to create a `User` → get `userId`
2. **Server:** POST to Basiq to create a `Connection` (Auth link) → get `authLink` URL
3. **Client:** Redirect the user to the `authLink` URL (Basiq-hosted bank login page)
4. **Server:** Basiq calls our webhook with the `connectionId` on success
5. **Server:** We use `connectionId` as our `accessToken` for future data queries

**Key Implementation Details:**
- **Base URL:** `https://au-api.basiq.io` (Australian-specific endpoint)
- **Auth:** Bearer token from `POST /token` with `BASIQ_API_KEY`
- **Token TTL:** Basiq access tokens expire in 3600 seconds — we need a token cache
- **User Creation:** Basiq requires creating a "User" object before creating connections
- **CDR Compliance:** Basiq manages the CDR consent UI natively — we just redirect

**Methods to implement:**
```ts
class BasiqConnector implements UniversalBankConnector {
    async createLinkToken(userId: string): Promise<string>
    // Returns a Basiq authLink URL (not a Plaid link_token)
    // The client will redirect to this URL instead of opening Plaid Link widget

    async exchangePublicToken(connectionId: string): Promise<BankConnectionResult>
    // Basiq calls this "connectionId" not a "public_token"
    // After webhook confirms connection, we store connectionId as accessToken

    async getAccounts(connectionId: string): Promise<UnifiedAccount[]>
    // GET /users/{userId}/accounts filtered by connectionId

    async getTransactions(connectionId: string, startDate: Date): Promise<UnifiedTransaction[]>
    // GET /users/{userId}/transactions with filterBy[connection.id]={connectionId}
}
```

---

#### [MODIFY] [factory.ts](file:///d:/LocalVersions/OpenNetWorth/src/features/bank/factory.ts)

Uncomment and wire up `BasiqConnector` for AU:

```diff
-// import { BasiqConnector } from './basiqConnector'; // Future
+import { BasiqConnector } from './basiqConnector';

 if (code === 'AU') {
-    // return new BasiqConnector();
-    console.warn('Basiq Connector not yet implemented...');
-    return new PlaidConnector();
+    return new BasiqConnector();
 }
```

---

#### [MODIFY] [types.ts (bank)](file:///d:/LocalVersions/OpenNetWorth/src/features/bank/types.ts)

The `BankConnectionResult.provider` union type already includes `'basiq'`. No change needed.
But we should add a `linkType` field to help the UI know whether to open Plaid Link or redirect:

```diff
 export interface BankConnectionResult {
     originalItemId: string;
     accessToken: string;
     provider: 'plaid' | 'basiq' | 'brankas';
+    /** 'widget' = open Plaid-style iframe. 'redirect' = redirect to external URL (Basiq) */
+    linkType?: 'widget' | 'redirect';
 }

+/** Returned by createLinkToken — context tells the client how to handle the token */
+export interface LinkTokenResult {
+    token: string;
+    /** If 'redirect', the token IS the URL to redirect to */
+    mode: 'plaid_link' | 'redirect';
+}
```

---

#### [MODIFY] [/api/bank/link/route.ts](file:///d:/LocalVersions/OpenNetWorth/src/app/api/bank/link/route.ts)

The response currently returns `{ link_token: string }`. For Basiq, we return a redirect URL.
We need to update the response shape so the client knows how to handle it:

```diff
-return NextResponse.json({ link_token: linkToken });
+return NextResponse.json({
+    link_token: linkToken,
+    // Tells the client whether to open Plaid Link widget or redirect
+    mode: country === 'AU' ? 'redirect' : 'plaid_link'
+});
```

---

#### [MODIFY] [ConnectBankButton.tsx](file:///d:/LocalVersions/OpenNetWorth/src/components/bank/ConnectBankButton.tsx)

This is the most significant UI change. Currently it's hardcoded to use Plaid Link.
We need to conditionally branch: if `mode === 'redirect'` (Basiq AU), redirect the user
to the auth URL instead of opening the Plaid Link widget.

**New Logic:**
```tsx
// If AU: server returns { link_token: "https://connect.basiq.io/...", mode: "redirect" }
// We show a button that opens this URL in the same tab (or new tab)
// Basiq will redirect back to our app at a callback URL after success.
```

A new `src/app/api/bank/callback/route.ts` endpoint is needed to handle the Basiq redirect.

---

#### [NEW] `src/app/api/bank/callback/route.ts`

Handles the return redirect from Basiq after the user completes bank login:
```
GET /api/bank/callback?jobId={basiq_job_id}&userId={basiq_user_id}
```
- Verifies the job completed successfully
- Stores the `connectionId` in `linked_items` (as `access_token`)
- Redirects the user back to the bank dashboard page

---

#### [NEW] `src/app/api/webhooks/basiq/route.ts`

Basiq sends webhook notifications on:
- `job.success` — bank connection completed
- `job.failed` — user authentication failed
- `refresh.success` — background refresh completed

Structure mirrors the existing `src/app/api/webhooks/plaid/route.ts`.

---

### Track 2 Environment Changes

#### [MODIFY] [env.ts](file:///d:/LocalVersions/OpenNetWorth/src/lib/env.ts)

```diff
+   BASIQ_API_KEY: z.string().optional(),
+   BASIQ_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
+   // The URL our app lives at — needed for Basiq's OAuth redirect
+   NEXT_PUBLIC_APP_URL: z.string().url().optional(),
```

#### [MODIFY] [env-example.txt](file:///d:/LocalVersions/OpenNetWorth/env-example.txt)

```diff
+# Basiq (Australian Bank Integration — CDR/Open Banking)
+# Sign up free at https://dashboard.basiq.io — Sandbox is free with mock AU bank data
+BASIQ_API_KEY=your_basiq_api_key
+BASIQ_ENV=sandbox
+NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### npm Package Changes

#### [MODIFY] `package.json`

```diff
 dependencies:
+    "yahoo-finance2": "^2.x.x",   // For ASX .AX stock tickers (no API key needed)
```

Note: `basiq` does **not** have an official npm SDK. The Basiq v3 API is consumed via raw
`fetch()` calls using their documented REST API. This is intentional — fewer dependencies,
full control over the request shape.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/marketData.ts` | MODIFY | Replace Alpha Vantage with Finnhub + Yahoo Finance routing |
| `src/services/providers/finnhubProvider.ts` | **NEW** | Finnhub REST integration (US/Global stocks) |
| `src/services/providers/yahooFinanceProvider.ts` | **NEW** | Yahoo Finance integration (ASX `.AX` tickers) |
| `src/services/providers/index.ts` | **NEW** | Barrel export |
| `src/lib/env.ts` | MODIFY | Remove Alpha Vantage vars, add Finnhub + Basiq vars |
| `src/features/assets/types.ts` | MODIFY | Update JSDoc comment on `currentPrice` |
| `src/features/bank/basiqConnector.ts` | **NEW** | Full Basiq v3 bank connector implementation |
| `src/features/bank/factory.ts` | MODIFY | Wire up BasiqConnector for AU country code |
| `src/features/bank/types.ts` | MODIFY | Add `linkType` and `LinkTokenResult` interface |
| `src/app/api/bank/link/route.ts` | MODIFY | Return `mode` field alongside `link_token` |
| `src/app/api/bank/callback/route.ts` | **NEW** | Handle Basiq OAuth redirect callback |
| `src/app/api/webhooks/basiq/route.ts` | **NEW** | Handle Basiq webhook notifications |
| `src/components/bank/ConnectBankButton.tsx` | MODIFY | Branch on `mode: 'plaid_link' | 'redirect'` |
| `env-example.txt` | MODIFY | Add Finnhub + Basiq keys, remove Alpha Vantage |
| `package.json` | MODIFY | Add `yahoo-finance2` dependency |

**Total: 5 new files, 9 modified files**

---

## Verification Plan

### Automated Tests
- Run `npm run build` after all changes to ensure TypeScript compiles with zero errors.
- Run `npm run lint` to ensure no eslint violations are introduced.

### Manual Verification — Stock API (Track 1)
1. **No key scenario:** Remove `FINNHUB_API_KEY` from `.env.local`. Verify the app starts,
   loads demo prices via `getMockPrice()`, and logs a warning (not an error crash).
2. **US Stock (Finnhub):** Add a US ticker like `AAPL` as an asset. Confirm live price loads
   in < 2 seconds with no rate-limit warning in the console.
3. **ASX Stock (Yahoo Finance):** Add an ASX ticker like `CBA.AX`. Confirm live price loads.
4. **Cache check:** Refresh the page. Confirm the second load is instant (cache hit), with no
   new network call visible in the Network tab (DevTools).

### Manual Verification — Bank API (Track 2)
1. **AU Bank Flow:** Set `countryCode='AU'` in the `ConnectBankButton`. Verify the button
   redirects to the Basiq sandbox login page.
2. **Mock Bank Login:** In the Basiq sandbox, use any of Basiq's provided mock credentials
   for a simulated CBA or NAB account.
3. **Callback:** After completing the Basiq sandbox login, verify the app redirects to
   `/api/bank/callback` correctly and stores the `connectionId` in `linked_items`.
4. **Account sync:** Run `syncAllBankConnections()`. Verify the BasiqConnector returns
   `UnifiedAccount[]` matching the mock sandbox data.
5. **Non-AU Bank Flow:** Verify `countryCode='US'` still opens the Plaid Link widget as
   before and the Plaid flow completes successfully (no regression).
