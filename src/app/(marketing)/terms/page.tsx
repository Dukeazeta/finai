import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="30 September 2026">
      <p>By creating a FinAI account you agree to these terms.</p>

      <h2>What FinAI is</h2>
      <p>
        FinAI is a tool for keeping a record of your own income and spending. It is not a bank, it does not hold or move money, and it
        is not a licensed financial adviser. Anything the assistant says about your spending is information about your own records, not
        financial advice.
      </p>

      <h2>Accuracy</h2>
      <p>
        The assistant can misread what you tell it. Every entry it makes is shown to you so you can check, edit or undo it. You are
        responsible for checking your records before you rely on them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password safe. You are responsible for activity on your account.</li>
        <li>Don&apos;t use FinAI to break the law or to try to access other people&apos;s data.</li>
        <li>You can delete your account at any time from Settings.</li>
      </ul>

      <h2>Pricing</h2>
      <p>FinAI is free to use today. If we introduce paid plans we will explain them before charging anyone anything.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If a change matters, we&apos;ll tell you in the app before it takes effect.</p>
    </LegalPage>
  );
}
