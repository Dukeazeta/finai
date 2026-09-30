"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pulseIssues } from "@/db/schema";
import { requirePulseAdmin } from "@/server/pulse/guard";

export async function setIssueStatus(id: string, status: "open" | "resolved" | "ignored") {
  await requirePulseAdmin();
  if (!["open", "resolved", "ignored"].includes(status)) return;
  await db.update(pulseIssues).set({ status }).where(eq(pulseIssues.id, id));
  revalidatePath("/app/pulse", "layout");
}

/** Throws on purpose so the owner can check server errors reach Pulse. */
export async function throwTestError() {
  await requirePulseAdmin();
  throw new Error("Pulse test error from the server");
}
