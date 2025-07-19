import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "dotenv";
config({path: ".env"})
// Disable prefetch as it is not supported for "Transaction" pool mode
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection
const client = postgres(connectionString, {
  prepare: false,
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create Drizzle instance
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === "development",
});

// Connection health check
export async function healthCheck(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await client.end();
    console.log("Database connection closed successfully");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

// Export the client for advanced use cases
export { client };

// Export types for convenience
export type Database = typeof db;
export * from "./schema";