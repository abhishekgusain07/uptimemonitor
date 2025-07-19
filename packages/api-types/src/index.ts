// Import only the type, not the runtime implementation
import type { AppRouter as BackendAppRouter } from '../../../apps/api/src/routers/_app';

// Re-export the type
export type AppRouter = BackendAppRouter;