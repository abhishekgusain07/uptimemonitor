import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL").optional(),
  
  // Server
  PORT: z.string().regex(/^\d+$/, "PORT must be a number").optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // OAuth Providers (optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email Configuration (optional for development)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, "SMTP_PORT must be a number").optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
}).refine((data) => {
  // In production, require email configuration
  if (data.NODE_ENV === 'production') {
    return !!(data.SMTP_HOST && data.SMTP_PORT && data.SMTP_USER && data.SMTP_PASS && data.SMTP_FROM);
  }
  return true;
}, {
  message: "Email configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) is required in production",
}).refine((data) => {
  // If GitHub OAuth is enabled, both client ID and secret are required
  if (data.GITHUB_CLIENT_ID || data.GITHUB_CLIENT_SECRET) {
    return !!(data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET);
  }
  return true;
}, {
  message: "Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required for GitHub OAuth",
}).refine((data) => {
  // If Google OAuth is enabled, both client ID and secret are required
  if (data.GOOGLE_CLIENT_ID || data.GOOGLE_CLIENT_SECRET) {
    return !!(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET);
  }
  return true;
}, {
  message: "Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google OAuth",
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      console.error('\nPlease check your .env file and ensure all required variables are set.');
    } else {
      console.error('❌ Unexpected error during environment validation:', error);
    }
    process.exit(1);
  }
}

// Re-export env for convenience
export const env = validateEnv();