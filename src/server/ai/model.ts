import "server-only";
import { createGoogle } from "@ai-sdk/google";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { errorMessage } from "@/server/finance/errors";
import { TOOLS, type ToolContext } from "./tools";

export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash";
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export function chatModel() {
  return google(CHAT_MODEL);
}

/** AI SDK tool set bound to one user. Errors become tool output so the model can explain them. */
export function chatTools(ctx: ToolContext): ToolSet {
  const out: ToolSet = {};
  for (const [name, t] of Object.entries(TOOLS)) {
    out[name] = tool({
      description: t.description,
      inputSchema: t.schema as z.ZodObject,
      execute: async (input: unknown) => {
        try {
          return await (t.run as (c: ToolContext, i: unknown) => Promise<unknown>)(ctx, input);
        } catch (e) {
          return { error: errorMessage(e) };
        }
      },
    });
  }
  return out;
}

/** Gemini Live function declarations generated from the same zod schemas. */
export function liveFunctionDeclarations() {
  return Object.entries(TOOLS).map(([name, t]) => {
    const schema = z.toJSONSchema(t.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
    delete schema.$schema;
    return { name, description: t.description, parametersJsonSchema: schema };
  });
}
