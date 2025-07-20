import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { auth } from '../lib/auth';
import { 
  db,
  eq, 
  and, 
  count,
  user, 
  userPreferences, 
  profileAuditLog,
  monitor,
  monitorAlertRecipient,
  subscription,
  planUsage,
} from '@uptime/database';

export const authRouter = createTRPCRouter({
  // Get current session
  getSession: publicProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user,
      session: ctx.session,
    };
  }),

  // Get current user profile with preferences
  getMe: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user preferences
      const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      // Get user from database to get latest data
      const userData = await db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      return {
        ...userData,
        preferences: preferences || {
          emailNotifications: true,
          pushNotifications: false,
          smsNotifications: false,
          weeklyReport: true,
          maintenanceAlerts: true,
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h' as const,
          language: 'en',
          theme: 'system' as const,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user profile',
        cause: error,
      });
    }
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        company: z.string().max(100).optional(),
        jobTitle: z.string().max(100).optional(),
        phone: z.string().max(20).optional(),
        website: z.string().url().optional().or(z.literal('')),
        bio: z.string().max(500).optional(),
        location: z.string().max(100).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const now = new Date();
        
        // Get current user data for audit logging
        const currentUser = await db.query.user.findFirst({
          where: eq(user.id, ctx.user.id),
        });

        if (!currentUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Track changes for audit log
        const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
        
        Object.entries(input).forEach(([field, newValue]) => {
          const oldValue = (currentUser as any)[field] as string | null;
          if (oldValue !== newValue && newValue !== undefined) {
            changes.push({
              field,
              oldValue,
              newValue: newValue as string,
            });
          }
        });

        // Update user in database
        const updatedUserResult = await db.update(user)
          .set({
            ...input,
            updatedAt: now,
          })
          .where(eq(user.id, ctx.user.id))
          .returning();
        const updatedUser = updatedUserResult[0];
        if (!updatedUser) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update user profile',
          });
        }

        // Log profile changes
        if (changes.length > 0) {
          await Promise.all(
            changes.map(change =>
              db.insert(profileAuditLog).values({
                userId: ctx.user.id,
                action: 'profile_update',
                fieldChanged: change.field,
                oldValue: change.oldValue,
                newValue: change.newValue,
                ipAddress: ctx.req?.ip,
                userAgent: ctx.req?.headers?.['user-agent'],
                sessionId: ctx.session?.id,
              })
            )
          );
        }

        // Also update Better Auth if name changed
        if (input.name) {
          await auth.api.updateUser({
            body: {
              userId: ctx.user.id,
              update: {
                name: input.name,
              },
            }
          });
        }

        return {
          user: updatedUser,
          changesLogged: changes.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
          cause: error,
        });
      }
    }),

  // Change password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await auth.api.changePassword({
          body: {
            userId: ctx.user.id,
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
          }
        });

        // Log password change
        await db.insert(profileAuditLog).values({
          userId: ctx.user.id,
          action: 'password_change',
          ipAddress: ctx.req?.ip,
          userAgent: ctx.req?.headers?.['user-agent'],
          sessionId: ctx.session?.id,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to change password. Please check your current password.',
          cause: error,
        });
      }
    }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        maintenanceAlerts: z.boolean().optional(),
        timezone: z.string().optional(),
        dateFormat: z.string().optional(),
        timeFormat: z.enum(['12h', '24h']).optional(),
        language: z.string().optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const now = new Date();

        // Check if preferences exist
        const existingPreferences = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, ctx.user.id),
        });

        let result;
        if (existingPreferences) {
          // Update existing preferences
          const updateResult = await db.update(userPreferences)
            .set({
              ...input,
              updatedAt: now,
            })
            .where(eq(userPreferences.userId, ctx.user.id))
            .returning();
          result = updateResult[0];
          if (!result) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update preferences',
            });
          }
        } else {
          // Create new preferences
          const createResult = await db.insert(userPreferences).values({
            userId: ctx.user.id,
            ...input,
          }).returning();
          result = createResult[0];
          if (!result) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create preferences',
            });
          }
        }

        // Log preferences change
        await db.insert(profileAuditLog).values({
          userId: ctx.user.id,
          action: 'preferences_update',
          ipAddress: ctx.req?.ip,
          userAgent: ctx.req?.headers?.['user-agent'],
          sessionId: ctx.session?.id,
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update preferences',
          cause: error,
        });
      }
    }),

  // Change email address (with verification)
  changeEmail: protectedProcedure
    .input(
      z.object({
        newEmail: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify current password  
        const signInResult = await auth.api.signInEmail({
          body: {
            email: ctx.user.email,
            password: input.password,
          }
        });

        if (!signInResult || !signInResult.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid password',
          });
        }

        // Check if new email is already in use
        const existingUser = await db.query.user.findFirst({
          where: eq(user.email, input.newEmail),
        });

        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email address is already in use',
          });
        }

        const now = new Date();

        // Update email (mark as unverified)
        const updatedUserResult = await db.update(user)
          .set({
            email: input.newEmail,
            emailVerified: false,
            verifiedEmailSent: now,
            updatedAt: now,
          })
          .where(eq(user.id, ctx.user.id))
          .returning();
        const updatedUser = updatedUserResult[0];
        if (!updatedUser) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update email address',
          });
        }

        // Send verification email
        await auth.api.sendVerificationEmail({
          body: {
            email: input.newEmail,
          }
        });

        // Log email change
        await db.insert(profileAuditLog).values({
          userId: ctx.user.id,
          action: 'email_change',
          fieldChanged: 'email',
          oldValue: ctx.user.email,
          newValue: input.newEmail,
          ipAddress: ctx.req?.ip,
          userAgent: ctx.req?.headers?.['user-agent'],
          sessionId: ctx.session?.id,
        });

        return {
          success: true,
          newEmail: input.newEmail,
          message: 'Email updated. Please check your new email address for verification.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change email address',
          cause: error,
        });
      }
    }),

  // Get account statistics and activity
  getAccountStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const monitorCountResult = await db
        .select({ count: count() })
        .from(monitor)
        .where(and(
          eq(monitor.userId, ctx.user.id),
          eq(monitor.isDeleted, false)
        ));

      const alertRecipientCountResult = await db
        .select({ count: count() })
        .from(monitorAlertRecipient)
        .leftJoin(monitor, eq(monitorAlertRecipient.monitorId, monitor.id))
        .where(and(
          eq(monitor.userId, ctx.user.id),
          eq(monitor.isDeleted, false)
        ));

      const monitorCount = monitorCountResult[0] || { count: 0 };
      const alertRecipientCount = alertRecipientCountResult[0] || { count: 0 };

      // Get recent activity from audit log
      const recentActivity = await db.query.profileAuditLog.findMany({
        where: eq(profileAuditLog.userId, ctx.user.id),
        orderBy: [profileAuditLog.createdAt],
        limit: 10,
      });

      const currentPlan = ctx.user.subPlan || 'BASIC';
      const planLimits = {
        BASIC: { monitors: 2, alertRecipients: 1 },
        PREMIUM: { monitors: 10, alertRecipients: 3 },
        ENTERPRISE: { monitors: -1, alertRecipients: 10 },
      };

      return {
        usage: {
          monitors: monitorCount.count,
          alertRecipients: alertRecipientCount.count,
        },
        limits: planLimits[currentPlan as keyof typeof planLimits],
        plan: currentPlan,
        recentActivity: recentActivity.map(activity => ({
          action: activity.action,
          fieldChanged: activity.fieldChanged,
          createdAt: activity.createdAt,
        })),
        accountAge: Math.floor((Date.now() - ctx.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get account statistics',
        cause: error,
      });
    }
  }),

  // Get security overview
  getSecurityOverview: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userData = await db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      if (!userData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return {
        emailVerified: userData.emailVerified,
        twoFactorEnabled: userData.twoFactorEnabled,
        lastLoginAt: userData.lastLoginAt,
        lastLoginIp: userData.lastLoginIp,
        hasBackupCodes: !!(userData.backupCodes as any[])?.length,
        accountStatus: {
          isActive: userData.isActive,
          isSuspended: userData.isSuspended,
          suspendedAt: userData.suspendedAt,
          suspensionReason: userData.suspensionReason,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get security overview',
        cause: error,
      });
    }
  }),

  // Delete account with comprehensive data cleanup
  deleteAccount: protectedProcedure
    .input(
      z.object({
        password: z.string().min(1),
        confirmation: z.literal('DELETE'),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify password before deletion
        const signInResult = await auth.api.signInEmail({
          body: {
            email: ctx.user.email,
            password: input.password,
          }
        });

        if (!signInResult || !signInResult.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid password',
          });
        }

        // Check for active subscription
        const activeSubscription = await db.query.subscription.findFirst({
          where: and(
            eq(subscription.userId, ctx.user.id),
            eq(subscription.status, 'ACTIVE')
          ),
        });

        if (activeSubscription && !activeSubscription.cancelAtPeriodEnd) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Please cancel your active subscription before deleting your account.',
          });
        }

        // Log account deletion
        await db.insert(profileAuditLog).values({
          userId: ctx.user.id,
          action: 'account_deletion',
          oldValue: input.reason || 'No reason provided',
          ipAddress: ctx.req?.ip,
          userAgent: ctx.req?.headers?.['user-agent'],
          sessionId: ctx.session?.id,
        });

        // Delete user account (cascading deletes will handle related data)
        await auth.api.deleteUser({
          body: {
            userId: ctx.user.id,
          }
        });

        return { 
          success: true,
          message: 'Account deleted successfully. We\'re sorry to see you go!',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to delete account. Please verify your password.',
          cause: error,
        });
      }
    }),

  // Resend email verification
  resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.emailVerified) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email is already verified',
      });
    }

    try {
      await auth.api.sendVerificationEmail({
        body: {
          email: ctx.user.email,
        }
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send verification email',
        cause: error,
      });
    }
  }),
});