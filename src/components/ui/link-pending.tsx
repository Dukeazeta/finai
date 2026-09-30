"use client";

import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";

/**
 * Put inside a <Link>. While that link's page is loading, a thin bar runs along the top of
 * the window, so a tap always gets an answer even on a slow connection.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return createPortal(<div role="progressbar" aria-label="Loading page" className="nav-progress" />, document.body);
}
