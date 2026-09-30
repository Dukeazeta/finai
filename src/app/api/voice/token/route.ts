import { GoogleGenAI, Modality } from "@google/genai";
import { hasGeminiKey, LIVE_MODEL, liveFunctionDeclarations } from "@/server/ai/model";
import { buildInstructions } from "@/server/ai/prompt";
import { getSettings } from "@/server/finance/settings";
import { getSession } from "@/server/session";

/**
 * Mints a single use Live API token with the model, instructions and tools locked in,
 * so the browser can talk to Gemini directly without ever seeing the API key.
 * The browser mints one ahead of time, so the conversation row is created later,
 * by the first transcript or tool call.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!hasGeminiKey()) return Response.json({ error: "Voice is not configured yet. Add GEMINI_API_KEY." }, { status: 503 });

  const userId = session.user.id;
  const settings = await getSettings(userId);
  const instructions = await buildInstructions(userId, session.user.name, settings, "voice");

  const config = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: instructions,
    tools: [{ functionDeclarations: liveFunctionDeclarations() }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 10 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model: LIVE_MODEL, config },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    if (!token.name) throw new Error("No token returned");
    return Response.json({ token: token.name, model: LIVE_MODEL });
  } catch (e) {
    console.error("voice token error", e);
    return Response.json({ error: "Couldn't start a voice session. Try again in a moment." }, { status: 502 });
  }
}
