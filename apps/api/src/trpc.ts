import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from './lib/auth';
import type { Session, User } from './lib/auth';

export interface Context {
  req?: Request;
  user: User | null;
  session: Session | null;
}

export const createContext = async (opts?: { req?: Request }): Promise<Context> => {
  // Extract session from request headers using Better Auth's simpler approach
  let user: User | null = null;
  let session: Session | null = null;

  if (opts?.req) {
    try {
      // Use Better Auth's session validation
      const sessionData = await auth.api.getSession({
        headers: Object.fromEntries(opts.req.headers.entries()),
      });
      
      if (sessionData?.session && sessionData?.user) {
        session = sessionData.session;
        user = sessionData.user;
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
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Subscription plan middleware
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
        message: `This feature requires ${requiredPlan} plan or higher`,
      });
    }

    return next({
      ctx: {
        user: ctx.user,
        session: ctx.session,
      },
    });
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Base procedures
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Subscription-based procedures
export const premiumProcedure = t.procedure.use(enforceSubscriptionPlan('PREMIUM'));
export const enterpriseProcedure = t.procedure.use(enforceSubscriptionPlan('ENTERPRISE'));