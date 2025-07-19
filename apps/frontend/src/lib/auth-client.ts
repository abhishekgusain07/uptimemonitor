import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../api/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  basePath: "/api/auth",
});

// Export types from the server
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;