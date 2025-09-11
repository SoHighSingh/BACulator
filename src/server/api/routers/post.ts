import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Helper function to clean up old tabs, keeping only the 5 most recent
async function cleanupOldTabs(db: PrismaClient, userId: string) {
  // Get all tabs for the user, ordered by creation date (newest first)
  const allTabs = await db.tab.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  // If user has more than 5 tabs, delete the oldest ones
  if (allTabs.length > 5) {
    const tabsToDelete = allTabs.slice(5); // Keep first 5, delete the rest
    const tabIdsToDelete = tabsToDelete.map(tab => tab.id);

    // Delete drinks associated with old tabs first (due to foreign key constraint)
    await db.drink.deleteMany({
      where: { tabId: { in: tabIdsToDelete } }
    });

    // Then delete the old tabs
    await db.tab.deleteMany({
      where: { id: { in: tabIdsToDelete } }
    });
  }
}

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
      weight: z.number().positive().max(1000),
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
    // Auto-close any existing open tabs before creating new one
    const openTab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
    if (openTab) {
      await ctx.db.tab.update({ 
        where: { id: openTab.id }, 
        data: { finishedAt: new Date() } 
      });
    }
    
    // Clean up old tabs - keep only the 5 most recent tabs per user
    await cleanupOldTabs(ctx.db, userId);
    
    // Create new tab
    return ctx.db.tab.create({
      data: { userId, name: `Session ${new Date().toLocaleString()}` },
    });
  }),
  stopTab: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const openTab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
    if (!openTab) throw new Error("No open tab");
    
    // Clean up old tabs when stopping a tab
    await cleanupOldTabs(ctx.db, userId);
    
    return ctx.db.tab.update({ where: { id: openTab.id }, data: { finishedAt: new Date() } });
  }),
  getCurrentTab: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Check for auto-end based on 12-hour sobriety rule
    const tab = await ctx.db.tab.findFirst({ 
      where: { userId, finishedAt: null },
      include: { drinks: true }
    });
    
    if (tab && tab.drinks.length > 0) {
      // Find the most recent drink
      const lastDrink = tab.drinks.reduce((latest, drink) => 
        new Date(drink.finishedAt) > new Date(latest.finishedAt) ? drink : latest
      );
      
      // Calculate hours since last drink
      const hoursSinceLastDrink = (new Date().getTime() - new Date(lastDrink.finishedAt).getTime()) / (1000 * 60 * 60);
      
      // If it's been 12+ hours since the last drink, auto-end the tab
      if (hoursSinceLastDrink >= 12) {
        await ctx.db.tab.update({
          where: { id: tab.id },
          data: { finishedAt: new Date() }
        });
        return null; // Return null to indicate no active tab
      }
    }
    
    return ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
  }),
  addDrink: protectedProcedure
    .input(z.object({
      standards: z.number().positive().max(20),
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
  updateDrink: protectedProcedure
    .input(z.object({
      drinkId: z.string(),
      standards: z.number().positive().max(20),
      finishedAt: z.string(), // ISO string
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Verify the drink belongs to the user's current tab
      const tab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
      if (!tab) throw new Error("No open tab");
      
      const drink = await ctx.db.drink.findFirst({
        where: { id: input.drinkId, tabId: tab.id },
      });
      if (!drink) throw new Error("Drink not found");
      
      return ctx.db.drink.update({
        where: { id: input.drinkId },
        data: {
          standards: input.standards,
          finishedAt: new Date(input.finishedAt),
        },
      });
    }),
  deleteDrink: protectedProcedure
    .input(z.object({
      drinkId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Verify the drink belongs to the user's current tab
      const tab = await ctx.db.tab.findFirst({ where: { userId, finishedAt: null } });
      if (!tab) throw new Error("No open tab");
      
      const drink = await ctx.db.drink.findFirst({
        where: { id: input.drinkId, tabId: tab.id },
      });
      if (!drink) throw new Error("Drink not found");
      
      return ctx.db.drink.delete({
        where: { id: input.drinkId },
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
