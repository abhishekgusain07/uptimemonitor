# Authentication Flow Documentation

This document explains how authentication works in this uptime monitoring application using Better Auth.

## Overview

The application uses [Better Auth](https://better-auth.com/) as the authentication framework with the following key components:

- **Server-side auth instance** (`apps/api/src/lib/auth.ts`)
- **Client-side auth client** (`apps/frontend/src/lib/auth-client.ts`)
- **Auth provider for React** (`apps/frontend/src/providers/auth-provider.tsx`)
- **Database schema** (`packages/database/src/schema.ts`)

## Architecture Flow

### 1. Database Layer
**Location**: `packages/database/src/schema.ts`

The authentication system uses four core tables:

- **`user`**: Stores user profile information
  - `id`, `name`, `email`, `emailVerified`, `image`
  - `subPlan`: Subscription tier ('BASIC', 'PREMIUM', 'ENTERPRISE')
  - `createdAt`, `updatedAt`

- **`session`**: Manages user sessions
  - `id`, `token`, `expiresAt`, `userId`
  - `ipAddress`, `userAgent` for security tracking

- **`account`**: Links social/OAuth accounts
  - Provider info, tokens, and credentials

- **`verification`**: Handles email verification tokens

### 2. Server-side Auth Configuration
**Location**: `apps/api/src/lib/auth.ts`

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { /* schema mapping */ }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  socialProviders: { github: {...}, google: {...} },
  session: { expiresIn: 7 days, cookieCache: enabled },
  // ... additional config
});
```

**Key Features**:
- Email/password authentication with verification
- Social login (GitHub, Google)
- Session management with 7-day expiry
- Cookie caching for performance
- Rate limiting (100 requests/minute)

### 3. Client-side Auth Client
**Location**: `apps/frontend/src/lib/auth-client.ts`

```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  basePath: "/api/auth",
});
```

This creates a typed client that communicates with the server's auth endpoints.

### 4. React Auth Provider
**Location**: `apps/frontend/src/providers/auth-provider.tsx`

The `AuthProvider` component wraps the app and provides authentication state:

```typescript
export function AuthProvider({ children }) {
  // Uses Better Auth's built-in useSession hook
  const { data: sessionData, isPending: isLoading } = authClient.useSession();

  const value = {
    user: sessionData?.user || null,
    session: sessionData?.session || null,
    isLoading,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
    updateUser: authClient.updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Key Points**:
- Uses Better Auth's reactive `useSession` hook
- Automatically updates when auth state changes
- Provides auth methods throughout the app
- No manual session polling needed

### 5. App Integration
**Location**: `apps/frontend/src/app/layout.tsx`

The app is wrapped with providers:

```typescript
<TRPCProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</TRPCProvider>
```

## Authentication Flow

### 1. Sign-in Process
**Location**: `apps/frontend/src/app/auth/signin/page.tsx`

1. User enters credentials or clicks social login
2. Client calls `authClient.signIn.email()` or `authClient.signIn.social()`
3. Request sent to server auth endpoints
4. Server validates credentials and creates session
5. Session cookie set in browser
6. `useSession` hook detects change and updates UI
7. User redirected to dashboard

### 2. Session Management

**Automatic State Updates**:
- The `useSession` hook automatically detects auth state changes
- No manual session refresh needed
- Cookie-based session with 7-day expiry
- Session extended on activity (every 24 hours)

**Session Storage**:
- Session token stored in HTTP-only cookie
- Cookie cache enabled for performance (5 min cache)
- IP address and user agent tracked for security

### 3. Protected Routes

Use the `useRequireAuth` hook for protected pages:

```typescript
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      window.location.href = "/auth/signin";
    }
  }, [auth.isLoading, auth.user]);

  return auth;
}
```

## API Endpoints

Better Auth automatically creates these endpoints on the server:

- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-up/email` - Email/password registration
- `GET /api/auth/sign-in/github` - GitHub OAuth
- `GET /api/auth/sign-in/google` - Google OAuth
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/change-password` - Change password
- And many more...

## Environment Variables

**Server** (`apps/api/.env`):
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
BETTER_AUTH_SECRET=
```

**Frontend** (`apps/frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Type Safety

The auth system is fully typed:

```typescript
// Server types
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// Client usage
const { user, session, isLoading } = useAuth();
// user and session are fully typed
```

## Security Features

1. **Session Security**:
   - HTTP-only cookies
   - Secure flag in production
   - SameSite protection
   - IP and user agent tracking

2. **Email Verification**:
   - Required for new accounts
   - Verification tokens with expiry

3. **Rate Limiting**:
   - 100 requests per minute per IP
   - Prevents brute force attacks

4. **CSRF Protection**:
   - Built into Better Auth
   - Automatic token handling

## Debugging

- Check browser Network tab for auth API calls
- Look for session cookie in Application tab
- Server logs show auth activity
- Client state visible in React DevTools

## Migration Notes

This app was migrated from a custom auth system to Better Auth. The key improvement was replacing manual session polling with Better Auth's reactive `useSession` hook, which automatically updates the UI when authentication state changes.