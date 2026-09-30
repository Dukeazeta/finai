"use client";

import { ErrorView } from "@/components/pulse/error-view";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 pt-2 pb-4 md:px-8">
      <ErrorView error={error} reset={reset} home="/app" />
    </div>
  );
}
