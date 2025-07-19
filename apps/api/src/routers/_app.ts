import { createTRPCRouter } from '../trpc';
import { userRouter } from './user';
import { monitoringRouter } from './monitoring';
import { authRouter } from './auth';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  monitoring: monitoringRouter,
});

export type AppRouter = typeof appRouter;