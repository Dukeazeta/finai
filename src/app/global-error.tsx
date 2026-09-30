"use client";

import { useEffect } from "react";
import { pulse } from "@/lib/pulse";
import "./globals.css";

/** Last resort when the root layout itself fails. It renders its own document. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    pulse.error(error, { boundary: "global", digest: error.digest ?? null });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-parchment p-4 pt-16 text-ink">
        <main className="mx-auto flex max-w-[640px] flex-col items-start gap-5">
          <h1 className="text-[40px] leading-[1.05] font-medium tracking-[-0.03em]">FinAI hit a problem.</h1>
          <p className="text-[16px] text-graphite">It&apos;s been reported. Try again in a moment.</p>
          <button type="button" onClick={reset} className="h-10 rounded-[28px] bg-lime px-4">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
