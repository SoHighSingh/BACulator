import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

import { TERMS_VERSION } from "~/lib/consent";
import { analyseDrinkText } from "~/server/bartender";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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

// A very heavy night can take more than a day to clear, so the estimate looks back 48 hours.
const NIGHT_WINDOW_MS = 48 * 60 * 60 * 1000;

// A drink time must be real, not in the future (a little slack for clock skew), and inside the window.
const drinkTime = z
  .string()
  .datetime()
  .refine((iso) => {
    const t = Date.parse(iso);
    return t <= Date.now() + 5 * 60 * 1000 && t >= Date.now() - NIGHT_WINDOW_MS;
  }, "Drink time must be within the last 48 hours");
const drinkId = z.string().min(1).max(64);

// Drinks that can still affect the estimate: everything finished in the window,
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
  if (!drink) throw new TRPCError({ code: "NOT_FOUND", message: "Drink not found" });
  return drink;
}

export const postRouter = createTRPCRouter({
  analyseDrink: protectedProcedure
    .input(z.object({ drinkText: z.string().trim().min(1).max(200) }))
    .mutation(({ ctx, input }) => analyseDrinkText(ctx.db, ctx.session.user.id, input.drinkText)),
  // Permanently removes the user and everything linked to them. Deleted child-first so it
  // doesn't depend on the database enforcing the schema's cascades.
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // One batch, so a failure part-way never leaves some of someone's data behind.
    await ctx.db.$transaction([
      ctx.db.drink.deleteMany({ where: { tab: { userId } } }),
      ctx.db.tab.deleteMany({ where: { userId } }),
      ctx.db.session.deleteMany({ where: { userId } }),
      ctx.db.account.deleteMany({ where: { userId } }),
      ctx.db.user.delete({ where: { id: userId } }),
    ]);
    return { deleted: true };
  }),
  // Which terms version this person last agreed to, so the app only asks again when it changes.
  consentStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { termsVersion: true, ageConfirmedAt: true },
    });
    return { termsVersion: user?.termsVersion ?? null, ageConfirmedAt: user?.ageConfirmedAt ?? null };
  }),
  // Saves the consent step: legal drinking age confirmed and the current terms agreed to.
  recordConsent: protectedProcedure
    .input(z.object({ termsVersion: z.literal(TERMS_VERSION), ageConfirmed: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { termsVersion: input.termsVersion, ageConfirmedAt: new Date() },
      });
      return { termsVersion: input.termsVersion };
    }),
  // Everything we hold about the signed-in user, for "Download my data" (APP 12 access).
  // Sign-in tokens are left out: they are secrets, not information about the person.
  exportMyData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        weight: true,
        sex: true,
        ageConfirmedAt: true,
        termsVersion: true,
        accounts: { select: { provider: true } },
        tabs: {
          orderBy: { createdAt: "asc" },
          select: {
            name: true,
            createdAt: true,
            finishedAt: true,
            drinks: {
              orderBy: { finishedAt: "asc" },
              select: {
                standards: true,
                finishedAt: true,
                name: true,
                volumeMl: true,
                abv: true,
                count: true,
                source: true,
                rawText: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
    const { accounts, tabs, weight, ...details } = user;
    return {
      exportedAt: new Date().toISOString(),
      notes: [
        "Standard drinks are stored as 10 g of alcohol each, whatever region the app shows.",
        "Weight is stored in kilograms.",
        "Sign-in tokens from Google are kept to sign you in but are not included here.",
      ],
      details: { ...details, weightKg: weight, signInWith: accounts.map((a) => a.provider) },
      sessions: tabs.map(({ drinks, ...tab }) => ({ ...tab, drinks: drinks.map(({ standards, ...d }) => ({ ...d, standards10g: standards })) })),
    };
  }),
  updateUserInfo: protectedProcedure
    .input(z.object({
      weight: z.number().min(30).max(300), // kg; the form enforces the same range
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
  addDrink: protectedProcedure
    .input(z.object({
      standards: z.number().positive().max(50),
      finishedAt: drinkTime,
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
      drinkId,
      standards: z.number().positive().max(50),
      finishedAt: drinkTime,
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
    .input(z.object({ drinkId }))
    .mutation(async ({ ctx, input }) => {
      await findOwnDrink(ctx.db, ctx.session.user.id, input.drinkId);
      return ctx.db.drink.delete({
        where: { id: input.drinkId },
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
});
