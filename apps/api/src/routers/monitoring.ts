import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const monitoringRouter = createTRPCRouter({
  getMonitors: publicProcedure.query(() => {
    return [
      {
        id: '1',
        name: 'Main Website',
        url: 'https://example.com',
        status: 'up' as const,
        lastChecked: new Date(),
        responseTime: 250,
      },
      {
        id: '2',
        name: 'API Endpoint',
        url: 'https://api.example.com',
        status: 'down' as const,
        lastChecked: new Date(),
        responseTime: null,
      },
      {
        id: '3',
        name: 'API Endpoint',
        url: 'https://towerly.abhishekgusain.com',
        status: 'up' as const,
        lastChecked: new Date(),
        responseTime: null,
      }
    ];
  }),

  getMonitor: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return {
        id: input.id,
        name: `Monitor ${input.id}`,
        url: `https://example-${input.id}.com`,
        status: 'up' as const,
        lastChecked: new Date(),
        responseTime: Math.floor(Math.random() * 500) + 100,
        uptime: 99.5,
        incidents: [
          {
            id: '1',
            startTime: new Date(Date.now() - 86400000),
            endTime: new Date(Date.now() - 86300000),
            duration: 100000,
            reason: 'Server timeout',
          },
        ],
      };
    }),

  createMonitor: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        interval: z.number().min(60).default(300),
      })
    )
    .mutation(({ input }) => {
      return {
        id: Math.random().toString(36).substring(7),
        name: input.name,
        url: input.url,
        interval: input.interval,
        status: 'pending' as const,
        createdAt: new Date(),
      };
    }),

  deleteMonitor: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return { success: true, deletedId: input.id };
    }),
});