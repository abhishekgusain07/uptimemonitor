import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from './lib/auth';
import type { Session, User } from './lib/auth';

export interface Context {
  req?: any; // Express Request or Web API Request
  user: User | null;
  session: Session | null;
}

export const createContext = async (opts?: { req?: any }): Promise<Context> => {
  // Extract session from request headers using Better Auth's simpler approach
  let user: User | null = null;
  let session: Session | null = null;

  if (opts?.req) {
    try {
      // Handle both Express requests and Web API requests
      let headers: Headers | Record<string, string> = {};
      
      if (opts.req.headers) {
        if (typeof opts.req.headers.entries === 'function') {
          // Web API Request with Headers object
          headers = opts.req.headers;
        } else {
          // Express Request with plain object
          headers = opts.req.headers as Record<string, string>;
        }
      }
      
      // Use Better Auth's session validation
      const sessionData = await auth.api.getSession({
        headers: headers as any, // Type assertion for Better Auth compatibility
      });
      
      if (sessionData?.session && sessionData?.user) {
        session = sessionData.session as Session;
        user = sessionData.user as User;
      }
    } catch (error) {
      // Session invalid or not found - continue with null user/session
      // Don't log in production to avoid noise
      if (process.env.NODE_ENV === 'development') {
        console.warn('Session validation failed:', error);
      }
    }
  }

  return {
    req: opts?.req,
    user,
    session,
  };
};

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// Authentication middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      // infers the `user` and `session` as non-nullable
      user: ctx.user as User,
      session: ctx.session as Session,
      req: ctx.req,
    },
  });
});

// Usage tracking and plan enforcement middleware
const enforceUsageLimit = (resourceType: 'monitors' | 'alertRecipients' | 'apiCalls', operation: 'create' | 'update' = 'create') =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    // Import database here to avoid circular dependencies
    const { db, monitor, monitorAlertRecipient, count, eq, and } = await import('@uptime/database');

    const userPlan = ctx.user.subPlan || 'BASIC';
    const planLimits = {
      BASIC: { monitors: 2, alertRecipients: 1, apiCalls: 1000 },
      PREMIUM: { monitors: 10, alertRecipients: 3, apiCalls: 10000 },
      ENTERPRISE: { monitors: -1, alertRecipients: 10, apiCalls: -1 }, // -1 means unlimited
    };

    const limits = planLimits[userPlan as keyof typeof planLimits];
    const limit = limits[resourceType];

    // Skip check for unlimited plans
    if (limit === -1) {
      return next({
        ctx: {
          user: ctx.user as User,
          session: ctx.session as Session,
          req: ctx.req,
        },
      });
    }

    // Check current usage for create operations
    if (operation === 'create') {
      let currentUsage = 0;

      switch (resourceType) {
        case 'monitors':
          const monitorCountResult = await db
            .select({ count: count() })
            .from(monitor)
            .where(and(
              eq(monitor.userId, ctx.user.id),
              eq(monitor.isDeleted, false)
            ));
          const monitorCount = monitorCountResult[0] || { count: 0 };
          currentUsage = monitorCount.count;
          break;

        case 'alertRecipients':
          const recipientCountResult = await db
            .select({ count: count() })
            .from(monitorAlertRecipient)
            .leftJoin(monitor, eq(monitorAlertRecipient.monitorId, monitor.id))
            .where(and(
              eq(monitor.userId, ctx.user.id),
              eq(monitor.isDeleted, false)
            ));
          const recipientCount = recipientCountResult[0] || { count: 0 };
          currentUsage = recipientCount.count;
          break;

        case 'apiCalls':
          // For API calls, we'll implement rate limiting separately
          // This is more for monthly quotas
          currentUsage = 0; // TODO: Implement API call tracking
          break;
      }

      if (currentUsage >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You have reached your ${resourceType} limit (${limit}) for the ${userPlan} plan. Please upgrade your plan to create more ${resourceType}.`,
        });
      }
    }

    return next({
      ctx: {
        user: ctx.user as User,
        session: ctx.session as Session,
        req: ctx.req,
        usage: {
          resourceType,
          limit,
          plan: userPlan,
        },
      },
    });
  });

// Subscription plan middleware (for feature access)
const enforceSubscriptionPlan = (requiredPlan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE') =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    const planHierarchy = {
      BASIC: 1,
      PREMIUM: 2,
      ENTERPRISE: 3,
    };

    const userPlan = ctx.user.subPlan || 'BASIC';
    if (planHierarchy[userPlan as keyof typeof planHierarchy] < planHierarchy[requiredPlan]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This feature requires ${requiredPlan} plan or higher. Current plan: ${userPlan}`,
      });
    }

    return next({
      ctx: {
        user: ctx.user as User,
        session: ctx.session as Session,
        req: ctx.req,
      },
    });
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Base procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Usage-limited procedures
export const createMonitorProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceUsageLimit('monitors', 'create'));
export const createAlertRecipientProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceUsageLimit('alertRecipients', 'create'));

// Subscription-based procedures
export const premiumProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceSubscriptionPlan('PREMIUM'));
export const enterpriseProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceSubscriptionPlan('ENTERPRISE'));