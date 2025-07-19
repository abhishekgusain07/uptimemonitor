import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@uptime/database";
import * as schema from "@uptime/database";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  basePath: "/api/auth",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:4000",
    // Add production domains here
    // "https://yourdomain.com",
    // "https://api.yourdomain.com"
  ],
  
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({ user, url });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email");
      }
    },
    sendVerificationEmail: async ({ user, url }:{
      user:{
        email: string;
        name: string
      },
      url: string
    }) => {
      try {
        await sendVerificationEmail({ user, url });
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
  },

  // Social providers
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

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  },

  // Security configuration
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Set to true for subdomains
    },
  },

  // Rate limiting
  rateLimit: {
    window: 60, // 1 minute
    max: 10, // 10 requests per minute for auth endpoints
    storage: "memory", // Use memory storage for rate limiting
  },

  // Additional user fields from our schema
  user: {
    additionalFields: {
      subPlan: {
        type: "string",
        required: false,
        defaultValue: "BASIC",
        input: false, // Don't allow input from client
        returned: true, // Return in user object
      },
      verifiedEmailSent: {
        type: "date",
        required: false,
        input: false,
        returned: false, // Don't expose to client
      },
    },
  },

  // Plugins and middleware
  plugins: [
    // Add any Better Auth plugins here
  ],
});

// Export types for type safety
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;