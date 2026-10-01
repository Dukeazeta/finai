"use client";

import { Eye, EyeOff } from "lucide-react";
import { hideGroup, type HideGroup } from "@/lib/hide-groups";
import { cn } from "@/lib/cn";
import { useApp } from "./app-context";

/** Eye button that hides or shows the amounts of one area, on every device. */
export function HideToggle({ group, tone = "default", className }: { group: HideGroup; tone?: "default" | "lime" | "dark"; className?: string }) {
  const { hidden, setHidden } = useApp();
  const isHidden = hidden.has(group);
  const { noun } = hideGroup(group);
  const label = `${isHidden ? "Show" : "Hide"} ${noun}`;
  const Icon = isHidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={() => setHidden([group], !isHidden)}
      aria-pressed={isHidden}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        tone === "default" && "border-ash text-ink hover:border-ink",
        tone === "lime" && "border-ink/25 text-ink hover:border-ink hover:bg-white/40",
        tone === "dark" && "border-white/25 text-white hover:border-white",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
