import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const userRouter = createTRPCRouter({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return {
        id: input.id,
        name: `User ${input.id}`,
        email: `user${input.id}@example.com`,
        createdAt: new Date(),
      };
    }),

  getAllUsers: publicProcedure.query(() => {
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() },
    ];
  }),

  createUser: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    )
    .mutation(({ input }) => {
      const newUser = {
        id: Math.random().toString(36).substring(7),
        name: input.name,
        email: input.email,
        createdAt: new Date(),
      };
      return newUser;
    }),

  updateUser: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(({ input }) => {
      return {
        id: input.id,
        name: input.name || `User ${input.id}`,
        email: input.email || `user${input.id}@example.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
});