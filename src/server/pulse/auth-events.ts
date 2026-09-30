import "server-only";
import { createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { recordEvent } from "./record";

type Ctx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

function method(path: string) {
  return path.startsWith("/callback/") ? path.slice("/callback/".length) : "email";
}

function failure(returned: unknown) {
  if (!isAPIError(returned)) return null;
  // OAuth callbacks finish with a redirect, which Better Auth models as a 302 "error".
  if (returned.statusCode >= 300 && returned.statusCode < 400) return null;
  return String((returned.body as { code?: string } | undefined)?.code ?? returned.status ?? "UNKNOWN");
}

/** Sign ups, sign ins (and failed ones), sign outs and password resets, as Pulse auth events. */
export const pulseAuthAfter = createAuthMiddleware(async (ctx: Ctx) => {
  const path = ctx.path;
  const tracked = path === "/sign-in/email" || path === "/sign-up/email" || path.startsWith("/callback/") || path === "/reset-password";
  if (!tracked) return;

  const headers = ctx.request?.headers ?? ctx.headers;
  const newSession = ctx.context.newSession;
  const failed = failure(ctx.context.returned);
  const how = method(path);

  if (path === "/reset-password") {
    if (!failed) recordEvent({ kind: "auth", name: "password_reset", props: { method: "email" } }, headers);
    return;
  }
  if (newSession) {
    const user = newSession.user;
    const isNew = path === "/sign-up/email" || Date.now() - new Date(user.createdAt).getTime() < 2 * 60 * 1000;
    if (isNew) recordEvent({ kind: "auth", name: "sign_up", userId: user.id, props: { method: how } }, headers);
    recordEvent({ kind: "auth", name: "sign_in", userId: user.id, props: { method: how } }, headers);
    return;
  }
  if (failed || path.startsWith("/callback/")) {
    const name = path === "/sign-up/email" ? "sign_up_failed" : "sign_in_failed";
    recordEvent({ kind: "auth", name, props: { method: how, reason: failed ?? "OAUTH_FAILED" } }, headers);
  }
});

/** Sign out is recorded before the session disappears, so we still know who it was. */
export const pulseAuthBefore = createAuthMiddleware(async (ctx: Ctx) => {
  if (ctx.path !== "/sign-out") return;
  const session = await getSessionFromCtx(ctx).catch(() => null);
  if (session) recordEvent({ kind: "auth", name: "sign_out", userId: session.user.id }, ctx.request?.headers ?? ctx.headers);
});
