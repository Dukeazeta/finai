import "server-only";

/**
 * Sends email through Resend when RESEND_API_KEY is set. Without it (local dev), the message is logged
 * so links like password resets can still be followed.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "FinAI <onboarding@resend.dev>", to, subject, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}
