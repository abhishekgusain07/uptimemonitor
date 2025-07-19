import { createTRPCReact } from '@trpc/react-query';

// Temporary type definition to avoid backend dependencies
// This will be replaced with proper type generation later
type AppRouter = {
  monitoring: {
    getMonitors: {
      input: void;
      output: Array<{
        id: string;
        name: string;
        url: string;
        status: 'up' | 'down' | 'pending';
        lastChecked?: Date;
        responseTime?: number | null;
      }>;
    };
    createMonitor: {
      input: { name: string; url: string };
      output: { id: string; name: string; url: string };
    };
    deleteMonitor: {
      input: { id: string };
      output: { success: boolean };
    };
  };
  user: {
    getAllUsers: {
      input: void;
      output: Array<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
      }>;
    };
  };
};

export const trpc = createTRPCReact<AppRouter>();