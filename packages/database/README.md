# @uptime/database

Shared database package for the Uptime Monitor application using Drizzle ORM with PostgreSQL.

## Features

- **Better Auth Compatible Schema**: Includes all required tables for Better Auth (user, session, account, verification)
- **Uptime Monitoring Schema**: Complete schema for monitors, results, logs, incidents, and alert recipients
- **Type Safety**: Full TypeScript support with inferred types
- **Connection Management**: Optimized PostgreSQL connection with pooling
- **Migration Support**: Drizzle Kit integration for schema migrations

## Setup

### 1. Environment Variables

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/uptime_monitor"
```

### 2. Install Dependencies

This package is automatically linked in the workspace. Run from the root:

```bash
pnpm install
```

### 3. Generate and Run Migrations

```bash
# Generate migration files
pnpm --filter @uptime/database db:generate

# Apply migrations to database
pnpm --filter @uptime/database db:migrate

# Or push schema directly (development only)
pnpm --filter @uptime/database db:push
```

## Usage

### Import the Database Client

```typescript
import { db } from "@uptime/database";
import { user, monitor, monitorResult } from "@uptime/database";
```

### Basic Queries

```typescript
// Get all users
const users = await db.select().from(user);

// Get user by email
const userByEmail = await db
  .select()
  .from(user)
  .where(eq(user.email, "user@example.com"));

// Create a new monitor
const newMonitor = await db
  .insert(monitor)
  .values({
    websiteName: "My Website",
    url: "https://example.com",
    userId: "user_id",
    interval: 5,
    timeout: 30,
    regions: ["us-east-1", "eu-west-1"]
  })
  .returning();
```

### Using Relations

```typescript
// Get user with their monitors
const userWithMonitors = await db.query.user.findFirst({
  where: eq(user.id, userId),
  with: {
    monitors: true
  }
});

// Get monitor with results and incidents
const monitorDetails = await db.query.monitor.findFirst({
  where: eq(monitor.id, monitorId),
  with: {
    results: {
      limit: 100,
      orderBy: desc(monitorResult.checkedAt)
    },
    incidents: {
      where: eq(incident.status, "OPEN")
    }
  }
});
```

## Schema Overview

### Better Auth Tables

- **user**: User accounts with authentication data
- **session**: User sessions for authentication
- **account**: OAuth provider accounts
- **verification**: Email verification tokens

### Monitoring Tables

- **monitor**: Website monitors configuration
- **monitor_result**: Historical monitoring results
- **monitor_log**: Detailed logging for debugging
- **incident**: Downtime incidents tracking
- **monitor_alert_recipient**: Alert email recipients
- **slug_ticket**: Public status page slug generation

## Available Scripts

- `db:generate` - Generate migration files from schema changes
- `db:migrate` - Apply pending migrations to database
- `db:push` - Push schema directly to database (development)
- `db:studio` - Open Drizzle Studio for database exploration
- `db:drop` - Drop database (use with caution)

## Types

All database types are automatically exported:

```typescript
import type { 
  User, 
  NewUser, 
  Monitor, 
  NewMonitor,
  MonitorResult,
  Incident
} from "@uptime/database";
```

## Connection Health

```typescript
import { healthCheck, closeConnection } from "@uptime/database";

// Check database connectivity
const isHealthy = await healthCheck();

// Graceful shutdown
await closeConnection();
```

## Subscription Plans

The schema includes subscription plan support:

- **BASIC**: 2 monitors, 1 alert recipient
- **PREMIUM**: 10 monitors, 3 alert recipients  
- **ENTERPRISE**: Unlimited monitors, 10 alert recipients

## Multi-Region Support

Monitors support multi-region monitoring with configurable regions:

- `us-east-1` (US East)
- `eu-west-1` (EU West)
- `ap-south-1` (Asia Pacific South)

Each monitor result includes region information for global performance tracking.