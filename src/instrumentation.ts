import type { Instrumentation } from "next";

export function register() {}

/** Every uncaught server error (pages, route handlers, server actions, the proxy) lands in Pulse. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { insertError, stackWithCauses } = await import("@/server/pulse/record");
    const { readAgent } = await import("@/server/pulse/ua");
    const error = err as Error & { digest?: string };
    const headers = new Headers();
    for (const [k, v] of Object.entries(request.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    // Who hit it, from the session cookie (cheap: the session is cached in a signed cookie).
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers }).catch(() => null);
    const ua = request.headers["user-agent"];
    const agent = readAgent(Array.isArray(ua) ? ua[0] : ua);
    await insertError({
      source: "server",
      name: error.name || "Error",
      message: error.message || "Unknown server error",
      stack: stackWithCauses(error),
      path: request.path.split("?")[0],
      userId: session?.user.id ?? null,
      props: {
        method: request.method,
        route: context.routePath,
        routeType: context.routeType,
        digest: error.digest ?? null,
      },
      browser: agent.browser,
      os: agent.os,
    });
  } catch (e) {
    console.error("pulse: could not record server error", e);
  }
};
