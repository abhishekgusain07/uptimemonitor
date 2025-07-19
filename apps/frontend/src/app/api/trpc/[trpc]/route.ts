import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../../../api/src/routers/_app';
import { createContext } from '../../../../../../api/src/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
  });

export { handler as GET, handler as POST };