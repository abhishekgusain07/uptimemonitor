# tRPC Architecture Guide - Complete Understanding

## Table of Contents
1. [What is tRPC?](#what-is-trpc)
2. [How tRPC Works](#how-trpc-works)
3. [tRPC in This Project](#trpc-in-this-project)
4. [File Structure & Relationships](#file-structure--relationships)
5. [Real Examples from Our Codebase](#real-examples-from-our-codebase)
6. [Key Benefits](#key-benefits)
7. [Common Patterns & Best Practices](#common-patterns--best-practices)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## What is tRPC?

**tRPC** stands for **TypeScript Remote Procedure Call**. It's a framework that allows you to build fully type-safe APIs without schemas or code generation.

### Core Concept
Instead of traditional REST APIs where you have separate endpoints like:
```
GET /api/users
POST /api/users
GET /api/subscriptions/current
```

tRPC lets you call server functions directly from the frontend as if they were local functions:
```typescript
// Frontend code that feels like local function calls
const users = await trpc.user.getAllUsers.query();
const subscription = await trpc.subscription.getCurrent.query();
const newUser = await trpc.user.create.mutate({ name: "John" });
```

### The Magic: End-to-End Type Safety
The revolutionary part is that TypeScript types flow automatically from backend to frontend:
- Define a function on the backend → Types automatically available on frontend
- Change backend function → Frontend immediately shows type errors
- No manual API documentation needed → Types ARE the documentation

---

## How tRPC Works

### 1. Router Definition (Backend)
You define "procedures" (functions) on the backend:
```typescript
// Backend router
const userRouter = createTRPCRouter({
  getAllUsers: publicProcedure
    .query(() => {
      return db.user.findMany(); // Returns User[]
    }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return db.user.create({ data: input }); // Returns User
    })
});
```

### 2. Type Export
The router type is exported:
```typescript
export type AppRouter = typeof appRouter;
```

### 3. Frontend Client
Frontend creates a typed client:
```typescript
const trpc = createTRPCReact<AppRouter>();
```

### 4. Usage
Now frontend has full type safety:
```typescript
// ✅ TypeScript knows this returns User[]
const { data: users } = trpc.user.getAllUsers.useQuery();

// ✅ TypeScript enforces the input shape
const createUser = trpc.user.create.useMutation();
createUser.mutate({ name: "John" }); // ✅ Valid
createUser.mutate({ email: "john@test.com" }); // ❌ Type error!
```

---

## tRPC in This Project

### Architecture Overview
```
Frontend (Next.js) ←→ tRPC Client ←→ tRPC Server ←→ Database (PostgreSQL)
```

### Our Implementation Stack
- **Frontend**: Next.js 15 with React 19
- **Backend**: Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Type Safety**: TypeScript end-to-end
- **State Management**: TanStack Query (React Query) via tRPC

---

## File Structure & Relationships

### Backend Structure
```
apps/api/src/
├── routers/
│   ├── _app.ts          # Main router that combines all routers
│   ├── auth.ts          # Authentication & user management
│   ├── subscription.ts  # Subscription & billing logic
│   ├── monitoring.ts    # Uptime monitoring features
│   └── user.ts          # User operations
├── trpc.ts              # tRPC configuration & middleware
├── lib/
│   └── auth.ts          # Better Auth configuration
└── index.ts             # Express server setup
```

### Frontend Structure
```
apps/frontend/src/
├── lib/
│   ├── trpc.ts          # tRPC client configuration
│   └── auth-client.ts   # Better Auth client
├── providers/
│   ├── trpc-provider.tsx # React Query + tRPC provider
│   └── auth-provider.tsx # Authentication context
└── app/
    ├── subscription/    # Subscription management page
    ├── profile/         # User profile management
    └── dashboard/       # Main dashboard
```

### Shared Types
```
packages/
├── api-types/           # Shared TypeScript types
│   └── src/index.ts     # Re-exports AppRouter type
└── database/            # Database schema & client
    └── src/schema.ts    # Drizzle schema definitions
```

---

## Real Examples from Our Codebase

### 1. Subscription Router (Backend)
```typescript
// apps/api/src/routers/subscription.ts
export const subscriptionRouter = createTRPCRouter({
  // Query: Get current subscription
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const userSubscription = await db.query.subscription.findFirst({
      where: eq(subscription.userId, ctx.user.id),
    });
    
    return {
      subscription: userSubscription,
      plan: { current: ctx.user.subPlan || 'BASIC' },
      usage: { monitors: 5, alertRecipients: 2 },
      limits: { monitors: 10, alertRecipients: 3 },
      canUpgrade: true,
      canDowngrade: false,
    };
  }),

  // Mutation: Change subscription plan
  changePlan: protectedProcedure
    .input(z.object({
      newPlan: z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    }))
    .mutation(async ({ input, ctx }) => {
      // Business logic for changing plans
      await db.update(user)
        .set({ subPlan: input.newPlan })
        .where(eq(user.id, ctx.user.id));
      
      return {
        success: true,
        plan: input.newPlan,
        message: `Successfully upgraded to ${input.newPlan} plan`,
      };
    }),
});
```

### 2. Frontend Usage
```typescript
// apps/frontend/src/app/subscription/page.tsx
export default function SubscriptionPage() {
  // Query: Automatically fetches and caches data
  const { data: currentSubscription, isLoading } = trpc.subscription.getCurrent.useQuery();
  const { data: availablePlans } = trpc.subscription.getPlans.useQuery();
  
  // Mutation: For updating data
  const changePlanMutation = trpc.subscription.changePlan.useMutation({
    onSuccess: () => {
      // Automatically refetch related queries
      trpc.subscription.getCurrent.invalidate();
    },
  });

  const handleUpgrade = async () => {
    try {
      await changePlanMutation.mutateAsync({
        newPlan: 'PREMIUM',
        billingCycle: 'monthly',
      });
      alert('Plan upgraded successfully!');
    } catch (error) {
      alert('Upgrade failed');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Current Plan: {currentSubscription?.plan?.current}</h1>
      <p>Monitors Used: {currentSubscription?.usage?.monitors}</p>
      <button onClick={handleUpgrade}>
        Upgrade to Premium
      </button>
    </div>
  );
}
```

### 3. Middleware & Authentication
```typescript
// apps/api/src/trpc.ts
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      user: ctx.user as User, // Now TypeScript knows user exists
      session: ctx.session as Session,
    },
  });
});

// Create protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
```

### 4. Usage Limits Middleware
```typescript
// apps/api/src/trpc.ts
const enforceUsageLimit = (resourceType: 'monitors' | 'alertRecipients') =>
  t.middleware(async ({ ctx, next }) => {
    const userPlan = ctx.user.subPlan || 'BASIC';
    const planLimits = {
      BASIC: { monitors: 2, alertRecipients: 1 },
      PREMIUM: { monitors: 10, alertRecipients: 3 },
      ENTERPRISE: { monitors: -1, alertRecipients: 10 }, // -1 = unlimited
    };

    const currentUsage = await db.select({ count: count() })
      .from(monitor)
      .where(eq(monitor.userId, ctx.user.id));

    if (currentUsage[0].count >= planLimits[userPlan][resourceType]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You have reached your ${resourceType} limit for the ${userPlan} plan.`,
      });
    }

    return next({ ctx });
  });

// Usage in router
export const createMonitorProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceUsageLimit('monitors'));
```

---

## Key Benefits

### 1. **Full Type Safety**
```typescript
// ❌ Traditional API - No type safety
const response = await fetch('/api/users');
const users = await response.json(); // users is 'any' type

// ✅ tRPC - Full type safety
const users = await trpc.user.getAllUsers.query(); // users is User[] type
```

### 2. **Automatic Caching & State Management**
```typescript
// Automatic caching via React Query
const { data, isLoading, error } = trpc.subscription.getCurrent.useQuery();

// Automatic background refetching
const { mutate } = trpc.subscription.changePlan.useMutation({
  onSuccess: () => {
    // Automatically invalidate and refetch related data
    trpc.subscription.getCurrent.invalidate();
  },
});
```

### 3. **Developer Experience**
- **IntelliSense**: Full autocomplete for all API calls
- **Error Prevention**: TypeScript catches errors at compile time
- **Refactoring**: Rename backend function → frontend updates automatically
- **No API Docs Needed**: Types serve as living documentation

### 4. **Real-time Error Handling**
```typescript
const { data, error, isLoading } = trpc.subscription.getCurrent.useQuery();

if (error) {
  // TypeScript knows the exact error structure
  console.log(error.message); // Automatically typed
}
```

---

## Common Patterns & Best Practices

### 1. **Query Patterns**
```typescript
// Simple query
const { data } = trpc.user.getMe.useQuery();

// Query with parameters
const { data } = trpc.subscription.getBillingHistory.useQuery({
  limit: 10,
  offset: 0,
});

// Conditional query (only runs when user exists)
const { data } = trpc.auth.getAccountStats.useQuery(
  undefined, // no input needed
  {
    enabled: !!user, // only run if user is logged in
  }
);
```

### 2. **Mutation Patterns**
```typescript
// Basic mutation
const createMonitor = trpc.monitoring.createMonitor.useMutation();

// Mutation with optimistic updates
const deleteMonitor = trpc.monitoring.deleteMonitor.useMutation({
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await trpc.monitoring.getMonitors.cancel();
    
    // Snapshot previous value
    const previousMonitors = trpc.monitoring.getMonitors.getData();
    
    // Optimistically update
    trpc.monitoring.getMonitors.setData(undefined, (old) =>
      old?.filter(monitor => monitor.id !== variables.id)
    );
    
    return { previousMonitors };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    trpc.monitoring.getMonitors.setData(undefined, context?.previousMonitors);
  },
  onSettled: () => {
    // Always refetch after mutation
    trpc.monitoring.getMonitors.invalidate();
  },
});
```

### 3. **Input Validation with Zod**
```typescript
// Backend procedure with validation
updateProfile: protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      company: z.string().max(100).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // input is fully typed and validated
    return await db.update(user)
      .set(input)
      .where(eq(user.id, ctx.user.id));
  }),
```

### 4. **Error Handling**
```typescript
// Backend: Throwing typed errors
if (!subscription) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Subscription not found',
  });
}

// Frontend: Handling typed errors
const { mutate } = trpc.subscription.changePlan.useMutation({
  onError: (error) => {
    if (error.data?.code === 'FORBIDDEN') {
      alert('You have reached your plan limit');
    } else {
      alert('Something went wrong');
    }
  },
});
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. **"Property 'subscription' does not exist on type"**
**Problem**: Frontend doesn't recognize backend routes
```typescript
// ❌ Error: Property 'subscription' does not exist
trpc.subscription.getCurrent.useQuery();
```

**Solution**: Check type imports
```typescript
// ✅ Ensure correct AppRouter import
import type { AppRouter } from '@repo/api-types';
export const trpc = createTRPCReact<AppRouter>();
```

#### 2. **Type Mismatches**
**Problem**: Backend returns different type than frontend expects
```typescript
// Backend returns: { status: 'up' | 'down' | 'paused' }
// Frontend expects: { status: 'up' | 'down' | 'pending' }
```

**Solution**: Use backend types, don't define custom types
```typescript
// ❌ Don't define custom types
type Monitor = { status: 'up' | 'down' | 'pending' };

// ✅ Let tRPC infer types
const monitors = trpc.monitoring.getMonitors.useQuery(); // Auto-typed
```

#### 3. **Context Type Issues**
**Problem**: `ctx.user.id` shows type error
```typescript
// ❌ Property 'id' does not exist on type '{}'
const userId = ctx.user.id;
```

**Solution**: Ensure proper middleware type assertions
```typescript
// ✅ Proper middleware setup
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  
  return next({
    ctx: {
      user: ctx.user as User, // Type assertion
      session: ctx.session as Session,
    },
  });
});
```

#### 4. **Query Not Updating**
**Problem**: Data doesn't refresh after mutation
```typescript
// ❌ Data stays stale after creating new item
const createItem = trpc.items.create.useMutation();
```

**Solution**: Invalidate related queries
```typescript
// ✅ Properly invalidate queries
const createItem = trpc.items.create.useMutation({
  onSuccess: () => {
    trpc.items.getAll.invalidate(); // Refetch items list
  },
});
```

---

## Summary

tRPC in this project provides:

1. **🔒 Type Safety**: Complete TypeScript coverage from database to UI
2. **🚀 Developer Experience**: IntelliSense, autocomplete, and compile-time error checking
3. **📡 Automatic API**: No need to write REST endpoints manually
4. **🔄 Smart Caching**: React Query integration for optimal data fetching
5. **🛡️ Built-in Security**: Middleware for authentication and authorization
6. **📊 Real-time Updates**: Automatic cache invalidation and refetching

The result is a maintainable, scalable, and developer-friendly full-stack application where changing the backend automatically updates the frontend types, preventing runtime errors and ensuring consistency across the entire application.