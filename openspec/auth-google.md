# Google Authentication Specification

## 1. Overview
This feature adds "Sign in with Google" to ClearWorth, allowing users to authenticate using their Google accounts via Supabase Auth (OAuth 2.0).

## 2. Prerequisites (External Setup)

### 2.1 Google Cloud Platform (GCP)
1.  Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2.  Enable **Google Identity** / **OAuth Consent Screen**.
    -   User Type: External.
    -   Scopes: `email`, `profile`, `openid`.
3.  Create Credentials -> **OAuth Client ID**.
    -   Type: Web Application.
    -   Authorized Origins: `http://localhost:4000`, `https://your-production-url.com`.
    -   Authorized Redirect URIs: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`.
4.  Copy **Client ID** and **Client Secret**.

### 2.2 Supabase Dashboard
1.  Go to **Authentication** > **Providers**.
2.  Enable **Google**.
3.  Paste Client ID and Client Secret.
4.  Save.

## 3. Implementation Details

### 3.1 Auth Callback Route (`src/app/auth/callback/route.ts`)
We must handle the server-side code exchange for PKCE flows.

```typescript
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient(); // Await if async
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
```

### 3.2 Login Page Update (`src/app/login/page.tsx`)
Add a specific button for Google Login.

```typescript
const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${location.origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });
    if (error) alert(error.message);
};
```

### 3.3 Database Triggers
Existing `handle_new_user` trigger in `public.profiles` will automatically create the user profile upon successful OAuth login, ensuring seamless integration with the rest of the app.

## 4. Environment Variables
No new *client-side* env vars needed if using Supabase, as the config is server-side in Supabase.
However, ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.

## 5. Security Considerations
-   **PKCE**: We use `@supabase/ssr` which handles PKCE automatically.
-   **State Parameter**: Handled by Supabase.
-   **Redirect validation**: Google Console whitelist prevents open redirect attacks.
