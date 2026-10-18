import { describe, expect, it, vi } from "vitest";

import { clearSignedInCaches } from "./sw-caches";

describe("clearSignedInCaches", () => {
  it("deletes the cached sign-in check and pages, and nothing else", async () => {
    const del = vi.fn().mockResolvedValue(true);
    await clearSignedInCaches({ delete: del } as unknown as CacheStorage);
    expect(del.mock.calls.map((c) => c[0] as string).sort()).toEqual(["auth-session", "pages"]);
  });

  it("signs out fine where there is no Cache Storage or a delete fails", async () => {
    await expect(clearSignedInCaches(undefined)).resolves.toBeUndefined();
    const del = vi.fn().mockRejectedValue(new Error("blocked"));
    await expect(clearSignedInCaches({ delete: del } as unknown as CacheStorage)).resolves.toBeUndefined();
  });
});
