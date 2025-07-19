// Export database client and utilities
export { db, healthCheck, closeConnection, client } from "./client";
export type { Database } from "./client";

// Export all schema tables, relations, and types
export * from "./schema";

// Re-export Drizzle ORM utilities for convenience
export { eq, and, or, not, isNull, isNotNull, desc, asc, count, sql } from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";