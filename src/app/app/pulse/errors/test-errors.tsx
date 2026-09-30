"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { flush, pulse } from "@/lib/pulse";
import { throwTestError } from "./actions";

/** Sends one browser error and one server error, to prove capture works end to end. */
export function TestErrors() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // Pulse skips its own pages for analytics, so send this one directly.
          pulse.error(new Error("Pulse test error from the browser"), { test: true });
          flush();
          await throwTestError().catch(() => {});
          setSent(true);
          setTimeout(() => router.refresh(), 1200);
        })
      }
    >
      {sent ? "Test errors sent" : "Send test errors"}
    </Button>
  );
}
