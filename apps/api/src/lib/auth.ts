// backend/src/lib/auth.ts - FIXED VERSION
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@uptime/database";
import * as schema from "@uptime/database";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  
  // IMPORTANT: This should match your backend URL
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  basePath: "/api/auth",
  
  // Add all your frontend URLs
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:4000",
    // Add production domains
    process.env.NEXT_PUBLIC_APP_URL !,
    process.env.FRONTEND_URL!,
  ].filter(Boolean), // Remove undefined values
  
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
      try {
        await sendPasswordResetEmail({ user, url });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email");
      }
    },
  },
  
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: any; url: string }) => {
      try {
        await sendVerificationEmail({ user, url });
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },

  // FIXED: Session configuration for cross-origin setup
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // FIXED: Cookie configuration
  advanced: {
    cookies: {
      // For development with different ports
      secure: {
        attributes: {
          secure: process.env.NODE_ENV === 'production',
        },
      },
      httpOnly: {
        attributes: {
          httpOnly: true,
        },
      },
      sameSite: {
        attributes: {
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        },
      },
      path: {
        attributes: {
          path: '/',
        },
      },
      // Don't set domain for localhost, but set for production
      ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN ? {
        domain: {
          attributes: {
            domain: process.env.COOKIE_DOMAIN,
          },
        },
      } : {}),
    },
    
    // Enable CORS handling
    crossOriginIsolated: false,
    
    // If you need cross-subdomain cookies in production
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
    },
  },

  rateLimit: {
    window: 60,
    max: 10,
    storage: "memory",
  },

  user: {
    additionalFields: {
      subPlan: {
        type: "string",
        required: false,
        defaultValue: "BASIC",
        input: false,
        returned: true,
      },
      verifiedEmailSent: {
        type: "date",
        required: false,
        input: false,
        returned: false,
      },
    },
  },
});

// Export properly typed auth object
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;