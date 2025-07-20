import { createTRPCRouter } from '../trpc';
import { userRouter } from './user';
import { monitoringRouter } from './monitoring';
import { authRouter } from './auth';
import { subscriptionRouter } from './subscription';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  monitoring: monitoringRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;