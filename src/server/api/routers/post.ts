import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  updateUserInfo: protectedProcedure
    .input(z.object({
      weight: z.number().int().min(1).max(1000),
      sex: z.enum(["male", "female"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: {
          weight: input.weight,
          sex: input.sex,
        },
      });
      return updatedUser;
    }),
  userInfo: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { weight: true, sex: true },
    });
    return user;
  }),
  startTab: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Check for open tab
    const openTab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
    if (openTab) return openTab;
    // Create new tab
    return ctx.db.tab.create({
      data: { userId, name: `Session ${new Date().toLocaleString()}` },
    });
  }),
  stopTab: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const openTab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
    if (!openTab) throw new Error("No open tab");
    return ctx.db.tab.update({ where: { id: openTab.id }, data: { finishedAt: new Date() } });
  }),
  getCurrentTab: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
  }),
  addDrink: protectedProcedure
    .input(z.object({
      standards: z.number().int().min(1).max(20),
      finishedAt: z.string(), // ISO string
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const tab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
      if (!tab) throw new Error("No open tab");
      return ctx.db.drink.create({
        data: {
          tabId: tab.id,
          standards: input.standards,
          finishedAt: new Date(input.finishedAt),
        },
      });
    }),
  getDrinks: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const tab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
    if (!tab) return [];
    return ctx.db.drink.findMany({
      where: { tabId: tab.id },
      orderBy: { finishedAt: "asc" },
    });
  }),
  getTabs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.tab.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }),
});
