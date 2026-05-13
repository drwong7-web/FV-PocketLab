## Goal
Let users request a password reset email from the auth screen and set a new password via a dedicated reset page.

## Flow

```text
/auth ──▶ "Forgot password?" link ──▶ /forgot-password
              │                              │
              │                              └─ enters email ──▶ Supabase sends reset email
              │                                                         │
              │                                                         ▼
              │                                          User clicks link in email
              │                                                         │
              │                                                         ▼
              │                                                /reset-password
              │                                                         │
              │                                                         └─ sets new password ──▶ /app
```

## Changes

### 1. Auth provider `src/lib/auth.tsx`
Add two methods to `AuthContextValue`:
- `requestPasswordReset(email)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`
- `updatePassword(newPassword)` → `supabase.auth.updateUser({ password })`

### 2. New page `src/pages/ForgotPassword.tsx` (public route)
- Single email input, "Send reset link" button.
- On success: shows a confirmation card ("Check your inbox at <email>") instead of redirecting, with a "Back to sign in" link.
- Error toast on failure.
- Same visual style as `Auth.tsx` (full-screen, centered glass card).

### 3. New page `src/pages/ResetPassword.tsx` (public route)
- On mount: rely on Supabase's automatic recovery-session detection from the URL hash (the listener in `AuthProvider` already handles `onAuthStateChange` — recovery links create a temporary session).
- Guard: if no active session after a brief load, show "This reset link is invalid or has expired" with a link back to `/forgot-password`.
- Form: new password + confirm password fields, both required, min 8 chars, must match.
- On submit: call `updatePassword`, then `signOut()` (so the recovery session can't linger), toast success, navigate to `/auth` with a success message — OR keep them signed in and navigate to `/app`. **Decision: keep them signed in and go to `/app`** (less friction, matches standard SaaS UX).

### 4. Routing `src/App.tsx`
- Add `<Route path="/forgot-password" element={<ForgotPassword />} />`
- Add `<Route path="/reset-password" element={<ResetPassword />} />`
- Both PUBLIC (outside `ProtectedRoute`) so the recovery link works whether or not the user is signed in.

### 5. Auth page `src/pages/Auth.tsx`
- Add a small "Forgot password?" link under the password field on the sign-in tab, linking to `/forgot-password`.

## Out of scope
- Custom-branded auth email templates (default Lovable Cloud reset email is used). Can be added later via a separate request.
- Rate-limiting UI for repeated requests (Supabase enforces server-side).
- Password strength meter.

## Technical notes
- `redirectTo` must be an absolute URL using `window.location.origin` so it works in preview, custom domain, and local dev.
- Recovery session is established by Supabase parsing the URL hash on load — no extra code needed beyond the existing `onAuthStateChange` listener.
- `ProtectedRoute` is unaffected; `/reset-password` lives outside it.
