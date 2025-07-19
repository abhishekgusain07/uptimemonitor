import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@uptime/database";
import * as schema from "@uptime/database";

export const auth = betterAuth({
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
    sendResetPassword: async ({ user, token, url }) => {
      // TODO: Implement email sending for password reset
      console.log(`Password reset for ${user.email}: ${url}`);
    },
    sendVerificationEmail: async ({ user, token, url }:{
      user: any,
      token: any, 
      url: any
    }) => {
      // TODO: Implement email sending for verification
      console.log(`Email verification for ${user.email}: ${url}`);
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
  },

  // Security configuration
  advanced: {
    generateId: false, // Use database default UUID generation
    crossSubDomainCookies: {
      enabled: false, // Set to true for subdomains
    },
  },

  // Rate limiting
  rateLimit: {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
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