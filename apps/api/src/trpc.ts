import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from './lib/auth';
import type { Session, User } from './lib/auth';
// Import database at top level if possible
import { db, monitor, monitorAlertRecipient, count, eq, and } from '@uptime/database';

export interface Context {
  req?: any;
  user: User | null;
  session: Session | null;
}

// Utility to convert Express request to Web API Request
const expressToWebRequest = (expressReq: any): Request => {
  const protocol = expressReq.protocol || 'http';
  const host = expressReq.get('host') || 'localhost:4000';
  const url = `${protocol}://${host}${expressReq.originalUrl || expressReq.url || '/'}`;
  
  // Convert headers more efficiently
  const headers = new Headers();
  for (const [key, value] of Object.entries(expressReq.headers || {})) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }
  
  // Create request with body if present
  const init: RequestInit = {
    method: expressReq.method || 'GET',
    headers,
  };
  
  // Add body for POST/PUT requests
  if (expressReq.body && ['POST', 'PUT', 'PATCH'].includes(expressReq.method)) {
    init.body = JSON.stringify(expressReq.body);
    headers.set('content-type', 'application/json');
  }
  
  return new Request(url, init);
};

export const createContext = async (opts?: { req?: any }): Promise<Context> => {
  let user: User | null = null;
  let session: Session | null = null;

  if (opts?.req) {
    try {
      // Development logging with better formatting
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔍 tRPC Context Creation');
        console.log('├─ Method:', opts.req.method);
        console.log('├─ Path:', opts.req.path || opts.req.url);
        console.log('├─ Has Cookie Header:', !!opts.req.headers?.cookie);
        console.log('└─ Origin:', opts.req.headers?.origin || 'N/A');
      }
      
      // Convert Express request to Web API Request
      const request = expressToWebRequest(opts.req);
      
      // Use Better Auth's session validation
      // Pass the full request object instead of just headers
      const sessionData = await auth.api.getSession({ headers: request.headers });
      
      if (sessionData?.session && sessionData?.user) {
        session = sessionData as Session;
        user = sessionData.user as User;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Authenticated:', user.email);
        }
      }
    } catch (error) {
      // Log error in development, but don't expose in production
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Auth validation error:', error);
      }
    }
  }

  return { req: opts?.req, user, session };
};

// Initialize tRPC
export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Enhanced authentication middleware with better error info
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      cause: 'No valid session found',
    });
  }
  
  return next({
    ctx: {
      user: ctx.user,
      session: ctx.session,
      req: ctx.req,
    },
  });
});

// Extracted usage checking logic
const checkResourceUsage = async (
  userId: string,
  resourceType: 'monitors' | 'alertRecipients'
): Promise<number> => {
  switch (resourceType) {
    case 'monitors':
      const [monitorCount] = await db
        .select({ count: count() })
        .from(monitor)
        .where(and(
          eq(monitor.userId, userId),
          eq(monitor.isDeleted, false)
        ));
      return monitorCount?.count || 0;

    case 'alertRecipients':
      const [recipientCount] = await db
        .select({ count: count() })
        .from(monitorAlertRecipient)
        .leftJoin(monitor, eq(monitorAlertRecipient.monitorId, monitor.id))
        .where(and(
          eq(monitor.userId, userId),
          eq(monitor.isDeleted, false)
        ));
      return recipientCount?.count || 0;

    default:
      return 0;
  }
};

// Plan limits configuration
const PLAN_LIMITS = {
  BASIC: { monitors: 2, alertRecipients: 1, apiCalls: 1000 },
  PREMIUM: { monitors: 10, alertRecipients: 3, apiCalls: 10000 },
  ENTERPRISE: { monitors: -1, alertRecipients: 10, apiCalls: -1 }, // -1 = unlimited
} as const;

// Enhanced usage limit middleware
const enforceUsageLimit = (
  resourceType: 'monitors' | 'alertRecipients' | 'apiCalls',
  operation: 'create' | 'update' = 'create'
) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userPlan = ((ctx.user as any).subPlan || 'BASIC') as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[userPlan];
    const limit = limits[resourceType];

    // Skip check for unlimited resources
    if (limit === -1) {
      return next({
        ctx: {
          ...ctx,
          usage: { resourceType, limit: 'unlimited', plan: userPlan },
        },
      });
    }

    // Check current usage for create operations
    if (operation === 'create' && resourceType !== 'apiCalls') {
      const currentUsage = await checkResourceUsage(
        ctx.user.id,
        resourceType as 'monitors' | 'alertRecipients'
      );

      if (currentUsage >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `${userPlan} plan limit reached: ${currentUsage}/${limit} ${resourceType}`,
          cause: {
            resourceType,
            currentUsage,
            limit,
            plan: userPlan,
            suggestion: `Upgrade to ${getNextPlan(userPlan)} for more ${resourceType}`,
          },
        });
      }

      return next({
        ctx: {
          ...ctx,
          usage: { resourceType, currentUsage, limit, plan: userPlan },
        },
      });
    }

    return next({ ctx });
  });

// Helper to get upgrade suggestion
const getNextPlan = (currentPlan: string): string => {
  const planOrder = ['BASIC', 'PREMIUM', 'ENTERPRISE'];
  const currentIndex = planOrder.indexOf(currentPlan);
  return planOrder[currentIndex + 1] || 'ENTERPRISE';
};

// Plan hierarchy for feature access
const PLAN_HIERARCHY = {
  BASIC: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
} as const;

// Enhanced subscription plan middleware
const enforceSubscriptionPlan = (requiredPlan: keyof typeof PLAN_HIERARCHY) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userPlan = ((ctx.user as any).subPlan || 'BASIC') as keyof typeof PLAN_HIERARCHY;
    
    if (PLAN_HIERARCHY[userPlan] < PLAN_HIERARCHY[requiredPlan]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `${requiredPlan} plan or higher required`,
        cause: {
          currentPlan: userPlan,
          requiredPlan,
          upgradeUrl: '/pricing', // Add your upgrade URL
        },
      });
    }

    return next({ ctx });
  });

// Export router and procedures
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Base procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Usage-limited procedures
export const createMonitorProcedure = protectedProcedure
  .use(enforceUsageLimit('monitors', 'create'));
  
export const createAlertRecipientProcedure = protectedProcedure
  .use(enforceUsageLimit('alertRecipients', 'create'));

// Subscription-based procedures
export const premiumProcedure = protectedProcedure
  .use(enforceSubscriptionPlan('PREMIUM'));
  
export const enterpriseProcedure = protectedProcedure
  .use(enforceSubscriptionPlan('ENTERPRISE'));

// Export types for use in routers
// export type { Context };
export type ProtectedContext = Context & {
  user: User;
  session: Session;
};