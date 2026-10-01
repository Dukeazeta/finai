import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userSettings, type UserSettings } from "@/db/schema";
import type { HideGroup } from "@/lib/hide-groups";

export async function getSettings(userId: string): Promise<UserSettings> {
  const row = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  if (row) return row;
  const [created] = await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }))!;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, "baseCurrency" | "locale" | "timezone" | "onboardedAt">>,
) {
  await getSettings(userId);
  const [row] = await db.update(userSettings).set(patch).where(eq(userSettings.userId, userId)).returning();
  return row;
}

/**
 * Adds or removes areas from the hidden list in one statement, so two devices
 * toggling different areas at the same moment can't overwrite each other.
 */
export async function setHiddenAmounts(userId: string, groups: HideGroup[], hidden: boolean) {
  await getSettings(userId);
  const list = sql`${`{${groups.join(",")}}`}::text[]`;
  const [row] = await db
    .update(userSettings)
    .set({
      hiddenAmounts: hidden
        ? sql`array(select distinct unnest(${userSettings.hiddenAmounts} || ${list}) order by 1)`
        : sql`array(select unnest(${userSettings.hiddenAmounts}) except select unnest(${list}) order by 1)`,
    })
    .where(eq(userSettings.userId, userId))
    .returning({ hiddenAmounts: userSettings.hiddenAmounts });
  return row.hiddenAmounts;
}
