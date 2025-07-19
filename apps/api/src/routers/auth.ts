import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { auth } from '../lib/auth';

export const authRouter = createTRPCRouter({
  // Get current session
  getSession: publicProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user,
      session: ctx.session,
    };
  }),

  // Get current user profile
  getMe: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Use Better Auth to update user
        const updatedUser = await auth.api.updateUser({
          userId: ctx.user.id,
          update: {
            name: input.name,
          },
        });

        return updatedUser;
      } catch (error) {
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
          userId: ctx.user.id,
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
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

  // Get user subscription details
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const planLimits = {
      BASIC: {
        monitors: 2,
        alertRecipients: 1,
        features: ['Basic monitoring', 'Email alerts'],
      },
      PREMIUM: {
        monitors: 10,
        alertRecipients: 3,
        features: ['Advanced monitoring', 'Multiple regions', 'Email alerts', 'SMS alerts'],
      },
      ENTERPRISE: {
        monitors: -1, // Unlimited
        alertRecipients: 10,
        features: ['Unlimited monitoring', 'All regions', 'Priority support', 'Custom integrations'],
      },
    };

    const userPlan = (ctx.user.subPlan as keyof typeof planLimits) || 'BASIC';
    
    return {
      currentPlan: userPlan,
      limits: planLimits[userPlan],
      usage: {
        // TODO: Get actual usage from database
        monitors: 0,
        alertRecipients: 0,
      },
    };
  }),

  // Delete account
  deleteAccount: protectedProcedure
    .input(
      z.object({
        password: z.string().min(1),
        confirmation: z.literal('DELETE'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify password before deletion
        await auth.api.signIn.email({
          email: ctx.user.email,
          password: input.password,
        });

        // Delete user account
        await auth.api.deleteUser({
          userId: ctx.user.id,
        });

        return { success: true };
      } catch (error) {
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
        email: ctx.user.email,
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