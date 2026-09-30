import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/server/email";
import { seedDefaultCategories } from "@/server/finance/categories";
import { getSettings } from "@/server/finance/settings";
import { pulseAuthAfter, pulseAuthBefore } from "@/server/pulse/auth-events";
import { isGoogleConfigured as googleConfigured } from "./features";

export const auth = betterAuth({
  appName: "FinAI",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Reset your FinAI password",
        `Hi ${user.name || "there"},\n\nUse this link to set a new password. It expires in an hour.\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
      );
    },
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : undefined,
  // Signed cookie cache: most requests skip the session lookup in the database.
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await getSettings(user.id);
          await seedDefaultCategories(user.id);
        },
      },
    },
  },
  hooks: { before: pulseAuthBefore, after: pulseAuthAfter },
  plugins: [nextCookies()],
});


