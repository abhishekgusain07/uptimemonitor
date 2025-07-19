import { createTRPCRouter } from '../trpc';
import { userRouter } from './user';
import { monitoringRouter } from './monitoring';

export const appRouter = createTRPCRouter({
  user: userRouter,
  monitoring: monitoringRouter,
});

export type AppRouter = typeof appRouter;