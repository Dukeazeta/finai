import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { getSettings } from "@/server/finance/settings";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For pages: redirects to sign in when there is no session. Cached so the layout and page share one lookup. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const settings = await getSettings(session.user.id);
  return { user: session.user, settings };
});

/** For route handlers and server actions: returns null instead of redirecting. */
export async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}
