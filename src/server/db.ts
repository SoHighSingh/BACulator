import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
// The WASM build: the default entry can resolve to the Node engine in the Worker bundle, which
// cannot run on Cloudflare ("could not locate the Query Engine"), breaking every DB call.
import { PrismaClient } from "@prisma/client/wasm";

import { env } from "~/env";

/**
 * On Cloudflare Workers the D1 binding only exists inside a request, so the client can't be a
 * module-level singleton. We build one Prisma client per D1 binding and cache it, and `db` is a
 * proxy that resolves the right client on each property access. Existing call sites
 * (`ctx.db.user...`, `PrismaAdapter(db)`) keep working unchanged.
 */
const clients = new WeakMap<D1Database, PrismaClient>();

export function getDb(): PrismaClient {
  const { env: cfEnv } = getCloudflareContext();
  const binding = cfEnv.DB;

  let client = clients.get(binding);
  if (!client) {
    client = new PrismaClient({
      adapter: new PrismaD1(binding),
      log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
    clients.set(binding, client);
  }
  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
