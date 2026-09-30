"use client";

import { ErrorView } from "@/components/pulse/error-view";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[960px] p-4 pt-16">
      <ErrorView error={error} reset={reset} home="/" />
    </main>
  );
}
