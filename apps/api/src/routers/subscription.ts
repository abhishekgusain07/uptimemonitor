import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  db,
  eq,
  and,
  desc,
  count,
  subscription,
  planUsage,
  billingHistory,
  user,
  monitor,
  monitorAlertRecipient,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingStatus,
} from '@uptime/database';

// Plan configuration with limits and features
const PLAN_CONFIGS = {
  BASIC: {
    name: 'Basic',
    price: 0,
    currency: 'USD',
    interval: 'month',
    monitors: 2,
    alertRecipients: 1,
    checkInterval: 5, // minutes
    dataRetention: 30, // days
    regions: ['us-east-1'],
    features: [
      'Basic monitoring',
      'Email alerts',
      '5-minute checks',
      '30-day data retention',
      'Single region monitoring',
    ],
  },
  PREMIUM: {
    name: 'Premium',
    price: 2900, // $29.00 in cents
    currency: 'USD',
    interval: 'month',
    monitors: 10,
    alertRecipients: 3,
    checkInterval: 1, // minutes
    dataRetention: 90, // days
    regions: ['us-east-1', 'eu-west-1', 'ap-south-1'],
    features: [
      'Advanced monitoring',
      'Multiple regions',
      'Email & SMS alerts',
      '1-minute checks',
      '90-day data retention',
      'Custom dashboards',
      'API access',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 9900, // $99.00 in cents
    currency: 'USD',
    interval: 'month',
    monitors: -1, // Unlimited
    alertRecipients: 10,
    checkInterval: 0.5, // 30 seconds
    dataRetention: 365, // days
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1'],
    features: [
      'Unlimited monitoring',
      'All regions',
      'Priority support',
      'Custom integrations',
      '30-second checks',
      '1-year data retention',
      'White-label status pages',
      'SLA guarantees',
      'Dedicated support',
    ],
  },
} as const;

export const subscriptionRouter = createTRPCRouter({
  // Get current subscription with usage data
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user's subscription
      const userSubscriptionResult = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, ctx.user.id))
        .orderBy(desc(subscription.createdAt))
        .limit(1);
      const userSubscription = userSubscriptionResult[0] || null;

      // Get current plan from user table if no subscription record
      const currentPlan = (userSubscription?.plan || ctx.user.subPlan || 'BASIC') as keyof typeof PLAN_CONFIGS;
      const planConfig = PLAN_CONFIGS[currentPlan];

      // Get current period usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get actual usage from database
      const monitorCountResult = await db
        .select({ count: count() })
        .from(monitor)
        .where(and(
          eq(monitor.userId, ctx.user.id),
          eq(monitor.isDeleted, false)
        ));
      const monitorCount = monitorCountResult[0] || { count: 0 };

      const alertRecipientCountResult = await db
        .select({ count: count() })
        .from(monitorAlertRecipient)
        .leftJoin(monitor, eq(monitorAlertRecipient.monitorId, monitor.id))
        .where(and(
          eq(monitor.userId, ctx.user.id),
          eq(monitor.isDeleted, false)
        ));
      const alertRecipientCount = alertRecipientCountResult[0] || { count: 0 };

      // Get or create current usage record
      const currentUsageResult = await db
        .select()
        .from(planUsage)
        .where(and(
          eq(planUsage.userId, ctx.user.id),
          eq(planUsage.periodStart, periodStart),
          eq(planUsage.periodEnd, periodEnd)
        ))
        .limit(1);
      let currentUsage = currentUsageResult[0] || null;

      if (!currentUsage) {
        const newUsageResult = await db.insert(planUsage).values({
          userId: ctx.user.id,
          subscriptionId: userSubscription?.id,
          periodStart,
          periodEnd,
          monitorsUsed: monitorCount.count,
          alertRecipientsUsed: alertRecipientCount.count,
        }).returning();
        currentUsage = newUsageResult[0]!;
        if (!currentUsage) {
          throw new Error('Failed to create usage record');
        }
      } else {
        // Update usage with current counts
        const updatedUsageResult = await db.update(planUsage)
          .set({
            monitorsUsed: monitorCount.count,
            alertRecipientsUsed: alertRecipientCount.count,
            updatedAt: now,
          })
          .where(eq(planUsage.id, currentUsage.id))
          .returning();
        currentUsage = updatedUsageResult[0]!;
        if (!currentUsage) {
          throw new Error('Failed to update usage record');
        }
      }

      return {
        subscription: userSubscription,
        plan: {
          current: currentPlan,
          config: planConfig,
        },
        usage: {
          monitors: currentUsage.monitorsUsed,
          alertRecipients: currentUsage.alertRecipientsUsed,
          apiCalls: currentUsage.apiCallsUsed,
          checksPerformed: currentUsage.checksPerformed,
        },
        limits: {
          monitors: planConfig.monitors,
          alertRecipients: planConfig.alertRecipients,
          checkInterval: planConfig.checkInterval,
          dataRetention: planConfig.dataRetention,
        },
        canUpgrade: currentPlan !== 'ENTERPRISE',
        canDowngrade: currentPlan !== 'BASIC',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get subscription details',
        cause: error,
      });
    }
  }),

  // Get all available plans
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const currentPlan = ctx.user.subPlan || 'BASIC';
    
    return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.price,
      currency: config.currency,
      interval: config.interval,
      limits: {
        monitors: config.monitors,
        alertRecipients: config.alertRecipients,
        checkInterval: config.checkInterval,
        dataRetention: config.dataRetention,
        regions: config.regions.length,
      },
      features: config.features,
      isCurrent: key === currentPlan,
      isPopular: key === 'PREMIUM',
    }));
  }),

  // Upgrade/downgrade subscription plan
  changePlan: protectedProcedure
    .input(z.object({
      newPlan: z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { newPlan, billingCycle } = input;
      const currentPlan = ctx.user.subPlan || 'BASIC';

      if (newPlan === currentPlan) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already on this plan',
        });
      }

      try {
        const now = new Date();
        const newPlanConfig = PLAN_CONFIGS[newPlan];

        // Check if downgrading and validate current usage
        if (newPlan === 'BASIC' && currentPlan !== 'BASIC') {
          const monitorCountResult = await db
            .select({ count: count() })
            .from(monitor)
            .where(and(
              eq(monitor.userId, ctx.user.id),
              eq(monitor.isDeleted, false)
            ));
          const monitorCount = monitorCountResult[0] || { count: 0 };

          if (monitorCount.count > newPlanConfig.monitors) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Cannot downgrade to ${newPlan}. You have ${monitorCount.count} monitors but the ${newPlan} plan only allows ${newPlanConfig.monitors}. Please delete some monitors first.`,
            });
          }
        }

        // Calculate period dates
        const periodStart = now;
        const periodEnd = new Date(now);
        if (billingCycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Update user's plan
        await db.update(user)
          .set({
            subPlan: newPlan,
            updatedAt: now,
          })
          .where(eq(user.id, ctx.user.id));

        // Create or update subscription record
        const existingSubscription = await db.query.subscription.findFirst({
          where: eq(subscription.userId, ctx.user.id),
          orderBy: [desc(subscription.createdAt)],
        });

        let subscriptionRecord;
        if (existingSubscription) {
          const updateResult = await db.update(subscription)
            .set({
              plan: newPlan,
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              updatedAt: now,
            })
            .where(eq(subscription.id, existingSubscription.id))
            .returning();
          subscriptionRecord = updateResult[0];
          if (!subscriptionRecord) {
            throw new Error('Failed to update subscription');
          }
        } else {
          const createResult = await db.insert(subscription).values({
            userId: ctx.user.id,
            plan: newPlan,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          }).returning();
          subscriptionRecord = createResult[0];
          if (!subscriptionRecord) {
            throw new Error('Failed to create subscription');
          }
        }

        // Create billing record for paid plans
        if (newPlan !== 'BASIC') {
          const yearlyDiscount = billingCycle === 'yearly' ? 0.8 : 1; // 20% yearly discount
          const amount = Math.round(newPlanConfig.price * (billingCycle === 'yearly' ? 12 : 1) * yearlyDiscount);

          await db.insert(billingHistory).values({
            userId: ctx.user.id,
            subscriptionId: subscriptionRecord.id,
            amount,
            currency: newPlanConfig.currency,
            status: 'PENDING',
            description: `${newPlanConfig.name} Plan - ${billingCycle} billing`,
            periodStart,
            periodEnd,
          });
        }

        return {
          success: true,
          plan: newPlan,
          subscription: subscriptionRecord,
          message: `Successfully ${currentPlan === 'BASIC' ? 'upgraded' : 'changed'} to ${newPlan} plan`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change subscription plan',
          cause: error,
        });
      }
    }),

  // Cancel subscription (will continue until period end)
  cancel: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
      feedback: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const activeSubscription = await db.query.subscription.findFirst({
          where: and(
            eq(subscription.userId, ctx.user.id),
            eq(subscription.status, 'ACTIVE')
          ),
        });

        if (!activeSubscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          });
        }

        const now = new Date();
        await db.update(subscription)
          .set({
            cancelAtPeriodEnd: true,
            cancelledAt: now,
            metadata: {
              ...activeSubscription.metadata as any,
              cancellationReason: input.reason,
              cancellationFeedback: input.feedback,
            },
            updatedAt: now,
          })
          .where(eq(subscription.id, activeSubscription.id));

        return {
          success: true,
          message: 'Subscription cancelled. You will continue to have access until the end of your current billing period.',
          accessUntil: activeSubscription.currentPeriodEnd,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel subscription',
          cause: error,
        });
      }
    }),

  // Reactivate cancelled subscription
  reactivate: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const cancelledSubscription = await db.query.subscription.findFirst({
        where: and(
          eq(subscription.userId, ctx.user.id),
          eq(subscription.cancelAtPeriodEnd, true)
        ),
      });

      if (!cancelledSubscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No cancelled subscription found',
        });
      }

      const now = new Date();
      await db.update(subscription)
        .set({
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(subscription.id, cancelledSubscription.id));

      return {
        success: true,
        message: 'Subscription reactivated successfully',
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reactivate subscription',
        cause: error,
      });
    }
  }),

  // Get billing history
  getBillingHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { limit, offset } = input;

        const billingRecords = await db
          .select()
          .from(billingHistory)
          .where(eq(billingHistory.userId, ctx.user.id))
          .orderBy(desc(billingHistory.createdAt))
          .limit(limit)
          .offset(offset);

        const totalCountResult = await db
          .select({ count: count() })
          .from(billingHistory)
          .where(eq(billingHistory.userId, ctx.user.id));
        const totalCount = totalCountResult[0] || { count: 0 };

        return {
          records: billingRecords.map(record => ({
            ...record,
            amount: record.amount / 100, // Convert cents to dollars
          })),
          pagination: {
            total: totalCount.count,
            limit,
            offset,
            hasMore: totalCount.count > offset + limit,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get billing history',
          cause: error,
        });
      }
    }),

  // Get usage analytics for current period
  getUsageAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get current usage
      const currentUsage = await db.query.planUsage.findFirst({
        where: and(
          eq(planUsage.userId, ctx.user.id),
          eq(planUsage.periodStart, periodStart)
        ),
      });

      // Get historical usage (last 6 months)
      const historicalUsage = await db
        .select()
        .from(planUsage)
        .where(eq(planUsage.userId, ctx.user.id))
        .orderBy(desc(planUsage.periodStart))
        .limit(6);

      const currentPlan = ctx.user.subPlan || 'BASIC';
      const planConfig = PLAN_CONFIGS[currentPlan as keyof typeof PLAN_CONFIGS];

      return {
        current: currentUsage || {
          monitorsUsed: 0,
          alertRecipientsUsed: 0,
          apiCallsUsed: 0,
          checksPerformed: 0,
        },
        limits: {
          monitors: planConfig.monitors,
          alertRecipients: planConfig.alertRecipients,
        },
        historical: historicalUsage.map(usage => ({
          period: usage.periodStart.toISOString().substring(0, 7), // YYYY-MM format
          monitors: usage.monitorsUsed,
          alertRecipients: usage.alertRecipientsUsed,
          apiCalls: usage.apiCallsUsed,
          checks: usage.checksPerformed,
        })),
        warnings: {
          monitorsNearLimit: planConfig.monitors > 0 && (currentUsage?.monitorsUsed || 0) >= planConfig.monitors * 0.8,
          alertRecipientsNearLimit: (currentUsage?.alertRecipientsUsed || 0) >= planConfig.alertRecipients * 0.8,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get usage analytics',
        cause: error,
      });
    }
  }),
});