import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings, type UserSettings } from "@/db/schema";

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
