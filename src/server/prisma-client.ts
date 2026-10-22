import type * as Prisma from "@prisma/client";

/**
 * Which Prisma build to load. Production runs on Cloudflare Workers, which can't run Prisma's
 * native query engine: the default `@prisma/client` entry resolved to the Node build there and
 * every database call failed ("could not locate the Query Engine"; sign-in showed
 * "Configuration"). So production loads the WASM build. `next dev` and the tests run on Node,
 * which can't import the WASM engine, so they load the regular client.
 *
 * `process.env.NODE_ENV` is inlined at build time, so each bundle keeps only one of the two
 * requires (Prisma stays external, see `serverExternalPackages`).
 */
const prisma: typeof Prisma =
  process.env.NODE_ENV === "production"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("@prisma/client/wasm") as typeof Prisma)
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("@prisma/client") as typeof Prisma);

export const PrismaClient = prisma.PrismaClient;
export type PrismaClient = Prisma.PrismaClient;

/** A unique-constraint violation (P2002), recognised by name so it works with either build. */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && e.name === "PrismaClientKnownRequestError" && (e as { code?: unknown }).code === "P2002";
}
