import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The FinAI mark: a speech bubble holding two ledger lines and a coin.
 * What you say becomes an entry in your books. Drawn on a 32 unit grid so it stays crisp at 16px.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path
        d="M10 4H22A7 7 0 0 1 29 11V17A7 7 0 0 1 22 24H14.5L7.5 29.5L9.2 24H10A7 7 0 0 1 3 17V11A7 7 0 0 1 10 4Z"
        fill="#beff50"
        stroke="#14140f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="8.5" y="9.6" width="15" height="2.8" rx="1.4" fill="#14140f" />
      <rect x="8.5" y="15" width="8.4" height="2.8" rx="1.4" fill="#14140f" />
      <circle cx="21.2" cy="16.4" r="2.5" fill="#14140f" />
    </svg>
  );
}

export function Logo({ href = "/", className, invert }: { href?: string; className?: string; invert?: boolean }) {
  return (
    <Link
      href={href}
      aria-label="FinAI home"
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] text-[26px] leading-none font-medium tracking-[-0.045em]",
        invert ? "text-white" : "text-ink",
        className,
      )}
    >
      <LogoMark className="size-[30px]" />
      <span className="-mt-0.5">finai</span>
    </Link>
  );
}
