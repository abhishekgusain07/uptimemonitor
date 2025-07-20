import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, createMonitorProcedure, createAlertRecipientProcedure } from '../trpc';
import { db, eq, and, desc, count, monitor, monitorResult, monitorAlertRecipient, user } from '@uptime/database';

export const monitoringRouter = createTRPCRouter({
  // Get user's monitors
  getMonitors: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userMonitors = await db.query.monitor.findMany({
        where: and(
          eq(monitor.userId, ctx.user.id),
          eq(monitor.isDeleted, false)
        ),
        orderBy: [desc(monitor.createdAt)],
      });

      return userMonitors.map(m => ({
        id: m.id,
        name: m.websiteName,
        url: m.url,
        status: m.status?.toLowerCase() as 'up' | 'down' | 'paused',
        lastChecked: m.lastCheckedAt,
        responseTime: null, // TODO: Get latest response time
        interval: m.interval,
        regions: m.regions || [],
        isPaused: m.isPaused,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      console.error('Failed to get monitors:', error);
      return [];
    }
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

  // Create monitor with usage limits
  createMonitor: createMonitorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        url: z.string().url(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
        expectedStatus: z.number().min(100).max(599).default(200),
        interval: z.number().min(1).max(60).default(5), // minutes
        timeout: z.number().min(1).max(30).default(10), // seconds
        regions: z.array(z.string()).default(['us-east-1']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const newMonitorResult = await db.insert(monitor).values({
          userId: ctx.user.id,
          websiteName: input.name,
          url: input.url,
          method: input.method,
          expectedStatus: input.expectedStatus,
          interval: input.interval,
          timeout: input.timeout,
          regions: input.regions,
          status: 'UP',
          isPaused: false,
        }).returning();

        const newMonitor = newMonitorResult[0];
        if (!newMonitor) {
          throw new Error('Failed to create monitor - no result returned');
        }
        return {
          id: newMonitor.id,
          name: newMonitor.websiteName,
          url: newMonitor.url,
          method: newMonitor.method,
          expectedStatus: newMonitor.expectedStatus,
          interval: newMonitor.interval,
          timeout: newMonitor.timeout,
          regions: newMonitor.regions,
          status: 'pending' as const,
          createdAt: newMonitor.createdAt,
        };
      } catch (error) {
        console.error('Failed to create monitor:', error);
        throw new Error('Failed to create monitor');
      }
    }),

  // Soft delete monitor
  deleteMonitor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify ownership
        const existingMonitor = await db.query.monitor.findFirst({
          where: and(
            eq(monitor.id, input.id),
            eq(monitor.userId, ctx.user.id),
            eq(monitor.isDeleted, false)
          ),
        });

        if (!existingMonitor) {
          throw new Error('Monitor not found or access denied');
        }

        // Soft delete
        await db.update(monitor)
          .set({
            isDeleted: true,
            updatedAt: new Date(),
          })
          .where(eq(monitor.id, input.id));

        return { success: true, deletedId: input.id };
      } catch (error) {
        console.error('Failed to delete monitor:', error);
        throw new Error('Failed to delete monitor');
      }
    }),

  // Add alert recipient with usage limits
  addAlertRecipient: createAlertRecipientProcedure
    .input(
      z.object({
        monitorId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify monitor ownership
        const monitorExists = await db.query.monitor.findFirst({
          where: and(
            eq(monitor.id, input.monitorId),
            eq(monitor.userId, ctx.user.id),
            eq(monitor.isDeleted, false)
          ),
        });

        if (!monitorExists) {
          throw new Error('Monitor not found or access denied');
        }

        // Check if recipient already exists
        const existingRecipient = await db.query.monitorAlertRecipient.findFirst({
          where: and(
            eq(monitorAlertRecipient.monitorId, input.monitorId),
            eq(monitorAlertRecipient.email, input.email)
          ),
        });

        if (existingRecipient) {
          throw new Error('Alert recipient already exists for this monitor');
        }

        const newRecipientResult = await db.insert(monitorAlertRecipient).values({
          monitorId: input.monitorId,
          email: input.email,
        }).returning();
        
        const newRecipient = newRecipientResult[0];
        if (!newRecipient) {
          throw new Error('Failed to create alert recipient - no result returned');
        }

        return {
          id: newRecipient.id,
          email: newRecipient.email,
          monitorId: newRecipient.monitorId,
          createdAt: newRecipient.createdAt,
        };
      } catch (error) {
        console.error('Failed to add alert recipient:', error);
        throw new Error('Failed to add alert recipient');
      }
    }),

  // Remove alert recipient
  removeAlertRecipient: protectedProcedure
    .input(z.object({ recipientId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify ownership through monitor
        const recipient = await db.query.monitorAlertRecipient.findFirst({
          where: eq(monitorAlertRecipient.id, input.recipientId),
          with: {
            monitor: true,
          },
        });

        if (!recipient || recipient.monitor.userId !== ctx.user.id) {
          throw new Error('Alert recipient not found or access denied');
        }

        await db.delete(monitorAlertRecipient)
          .where(eq(monitorAlertRecipient.id, input.recipientId));

        return { success: true, removedId: input.recipientId };
      } catch (error) {
        console.error('Failed to remove alert recipient:', error);
        throw new Error('Failed to remove alert recipient');
      }
    }),
});