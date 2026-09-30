"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { pulse } from "@/lib/pulse";

/** Shared body for error boundaries: reports the crash to Pulse and offers a way back. */
export function ErrorView({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  useEffect(() => {
    pulse.error(error, { boundary: true, digest: error.digest ?? null });
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-5 rounded-[28px] bg-parchment p-8 sm:p-12">
      <p className="eyebrow text-graphite">Something broke</p>
      <h1 className="max-w-[18ch] text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.03em]">This page hit a problem.</h1>
      <p className="max-w-[48ch] text-[16px] text-graphite">
        It&apos;s been reported, so we can fix it. Your data is safe. Try again, or head back and carry on.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href={home} className={buttonClass("outline")}>
          Go back
        </Link>
      </div>
      {error.digest && <p className="text-[13px] text-stone">Reference {error.digest}</p>}
    </div>
  );
}
