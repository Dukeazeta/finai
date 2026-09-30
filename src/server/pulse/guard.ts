import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/session";
import { isPulseAdmin } from "./admin";

/** For Pulse pages and actions. Everyone else gets a plain 404, so the area doesn't advertise itself. */
export async function requirePulseAdmin() {
  const ctx = await requireUser();
  if (!isPulseAdmin(ctx.user.email)) notFound();
  return ctx;
}
