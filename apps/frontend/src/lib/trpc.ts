import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@repo/api-types';

export const trpc = createTRPCReact<AppRouter>();