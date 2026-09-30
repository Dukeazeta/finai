import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { LinkPending } from "./link-pending";

type Variant = "primary" | "outline" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[28px] font-normal transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-out-soft)] select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-lime text-ink hover:bg-[#b0f23c] active:bg-[#a6e834]",
  outline: "border border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink hover:bg-parchment",
  dark: "bg-ink text-white hover:bg-charcoal",
  danger: "border border-alert text-alert hover:bg-alert hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[14px]",
  md: "h-10 px-4 text-[16px]",
  lg: "h-12 px-6 text-[16px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; chevron?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, chevron, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
      {chevron && !loading && <ChevronRight className="-mr-1 size-4" strokeWidth={1.75} aria-hidden />}
    </button>
  );
});

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; chevron?: boolean };

export function LinkButton({ variant = "primary", size = "md", chevron, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {chevron && <ChevronRight className="-mr-1 size-4" strokeWidth={1.75} aria-hidden />}
    </Link>
  );
}

/** Perk's underlined card link: "Explore travel ›". */
export function ArrowLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link className={cn("group inline-flex items-center gap-1 text-[14px] font-medium text-ink", className)} {...rest}>
      <span className="border-b border-ink pb-px">{children}</span>
      <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
      <LinkPending />
    </Link>
  );
}
