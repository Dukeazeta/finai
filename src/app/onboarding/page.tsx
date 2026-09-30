import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const { user, settings } = await requireUser();
  if (settings.onboardedAt) redirect("/app");
  const first = user.name?.split(" ")[0];

  return (
    <div className="min-h-dvh bg-parchment p-3">
      <header className="flex h-16 items-center px-3 sm:px-6">
        <Logo href="/" />
      </header>
      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-3 pt-6 pb-16 lg:grid-cols-[1fr_480px] lg:pt-14">
        <div className="flex flex-col justify-between rounded-[28px] bg-lime p-8 sm:p-12">
          <p className="eyebrow">Getting set up</p>
          <div className="pt-16">
            <h1 className="text-[clamp(3rem,6vw,5rem)] leading-[0.9] font-medium tracking-[-0.03em]">
              {first ? `Hi ${first}.` : "Hi there."} Two things and you&apos;re in.
            </h1>
            <p className="mt-6 max-w-[40ch] text-[16px]">
              Pick the currency you think in, and tell us where most of your money sits. You can add more accounts later, or just tell
              FinAI about them.
            </p>
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 sm:p-10">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
