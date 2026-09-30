import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Perk pill tag: "+ AI POLICY". */
export function PillTag({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex h-8 items-center gap-1.5 rounded-full border px-3",
        dark ? "border-white/60 text-white" : "border-stone text-ink",
        className,
      )}
    >
      <Plus className="size-3.5" strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow text-graphite", className)}>{children}</p>;
}

/** Centered Perk section statement: 60px heading, short subcopy. */
export function Statement({ title, sub, children, className }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-[860px] flex-col items-center text-center", className)}>
      <h2 data-reveal="line" className="text-[clamp(2.5rem,6vw,3.75rem)] leading-[1] font-medium tracking-[-0.03em]">{title}</h2>
      {sub && (
        <p data-reveal="rise" style={{ ["--i" as string]: 1 }} className="mt-5 max-w-[46ch] text-[16px] text-graphite">
          {sub}
        </p>
      )}
      {children && (
        <div data-reveal="rise" style={{ ["--i" as string]: 2 }} className="mt-7">
          {children}
        </div>
      )}
    </div>
  );
}
