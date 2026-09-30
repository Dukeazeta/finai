import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="30 September 2026">
      <p>This page explains what FinAI stores, why, and who else handles it, in plain language.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your name, email address and, if you use Google sign in, your Google profile picture.</li>
        <li>Your password in hashed form, if you sign up with email. We never see the password itself.</li>
        <li>The accounts, categories, transactions, budgets and bills you create.</li>
        <li>Your chats with the assistant, including transcripts of voice sessions. We do not store voice recordings.</li>
        <li>Your main currency and timezone.</li>
      </ul>

      <h2>Who else handles it</h2>
      <ul>
        <li>Google processes the messages and audio you send to the assistant through the Gemini API so it can understand and reply.</li>
        <li>Our database host stores your data.</li>
        <li>Google handles sign in if you choose &ldquo;Continue with Google&rdquo;.</li>
        <li>An email provider delivers password reset emails.</li>
      </ul>
      <p>We don&apos;t sell your data and we don&apos;t use it for advertising.</p>

      <h2>What FinAI can&apos;t see</h2>
      <p>FinAI never connects to your bank. It only knows what you tell it.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Export your transactions as CSV from the Transactions page.</li>
        <li>Delete any entry or chat at any time.</li>
        <li>Delete your account from Settings. This removes your data from our database.</li>
      </ul>
    </LegalPage>
  );
}
