"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the server data every so often while the tab is visible, so live numbers stay live. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
