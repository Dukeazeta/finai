"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setIssueStatus } from "../actions";

export function IssueActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const set = (s: "open" | "resolved" | "ignored") => start(() => setIssueStatus(id, s));
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "resolved" && (
        <Button onClick={() => set("resolved")} disabled={pending}>
          Mark resolved
        </Button>
      )}
      {status !== "ignored" && (
        <Button variant="outline" onClick={() => set("ignored")} disabled={pending}>
          Ignore
        </Button>
      )}
      {status !== "open" && (
        <Button variant="outline" onClick={() => set("open")} disabled={pending}>
          Reopen
        </Button>
      )}
    </div>
  );
}
