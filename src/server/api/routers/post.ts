import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

import { analyseDrinkText } from "~/server/bartender";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const drinkDetailsSchema = z.object({
  name: z.string().max(200).optional(),
  volumeMl: z.number().min(0).max(50000).optional(),
  abv: z.number().min(0).max(100).optional(),
  count: z.number().min(0).max(100).optional(),
  source: z.enum(["recent", "cache", "catalog", "ai", "manual", "edited"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawText: z.string().max(200).optional(),
});

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

const NIGHT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Drinks that can still affect the estimate: everything finished in the last 24 hours,
// whatever session it was logged in, so stopping a session never hides alcohol still in the body.
function nightDrinksWhere(userId: string) {
  return { tab: { userId }, finishedAt: { gte: new Date(Date.now() - NIGHT_WINDOW_MS) } };
}

async function findOrStartTab(db: PrismaClient, userId: string) {
  const open = await db.tab.findFirst({ where: { userId, finishedAt: null } });
  if (open) return open;
  await cleanupOldTabs(db, userId);
  return db.tab.create({ data: { userId, name: `Session ${new Date().toLocaleString()}` } });
}

async function findOwnDrink(db: PrismaClient, userId: string, drinkId: string) {
  const drink = await db.drink.findFirst({ where: { id: drinkId, tab: { userId } } });
  if (!drink) throw new Error("Drink not found");
  return drink;
}

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  analyseDrink: protectedProcedure
    .input(z.object({ drinkText: z.string().trim().min(1).max(200) }))
    .mutation(({ ctx, input }) => analyseDrinkText(ctx.db, ctx.session.user.id, input.drinkText)),
  // Permanently removes the user and everything linked to them. Deleted child-first so it
  // doesn't depend on the database enforcing the schema's cascades.
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    await ctx.db.drink.deleteMany({ where: { tab: { userId } } });
    await ctx.db.tab.deleteMany({ where: { userId } });
    await ctx.db.session.deleteMany({ where: { userId } });
    await ctx.db.account.deleteMany({ where: { userId } });
    await ctx.db.user.delete({ where: { id: userId } });
    return { deleted: true };
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
      standards: z.number().positive().max(50),
      finishedAt: z.string(), // ISO string
      // What the bartender parsed, if the drink came from text (all optional for manual entry)
      details: drinkDetailsSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tab = await findOrStartTab(ctx.db, ctx.session.user.id);
      return ctx.db.drink.create({
        data: {
          tabId: tab.id,
          standards: input.standards,
          finishedAt: new Date(input.finishedAt),
          source: "manual",
          ...input.details,
        },
      });
    }),
  updateDrink: protectedProcedure
    .input(z.object({
      drinkId: z.string(),
      standards: z.number().positive().max(50),
      finishedAt: z.string(), // ISO string
    }))
    .mutation(async ({ ctx, input }) => {
      await findOwnDrink(ctx.db, ctx.session.user.id, input.drinkId);
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
      await findOwnDrink(ctx.db, ctx.session.user.id, input.drinkId);
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
  getNight: protectedProcedure.query(({ ctx }) =>
    ctx.db.drink.findMany({
      where: nightDrinksWhere(ctx.session.user.id),
      orderBy: { finishedAt: "asc" },
    }),
  ),
  // Up to four distinct drinks the user has had lately, newest first, for one-tap re-adding.
  recentDrinks: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.drink.findMany({
      where: { tab: { userId: ctx.session.user.id } },
      orderBy: { finishedAt: "desc" },
      take: 60,
      select: { standards: true, name: true, volumeMl: true, abv: true, count: true },
    });
    const seen = new Set<string>();
    const recents: typeof rows = [];
    for (const row of rows) {
      const key = `${row.name ?? ""}|${row.standards}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recents.push(row);
      if (recents.length === 4) break;
    }
    return recents;
  }),
  getTabs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.tab.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }),
});
