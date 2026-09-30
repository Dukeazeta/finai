import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  Circle,
  Clapperboard,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Laptop,
  Plug,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Undo2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  bus: Bus,
  circle: Circle,
  clapperboard: Clapperboard,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "hand-heart": HandHeart,
  "heart-pulse": HeartPulse,
  house: House,
  laptop: Laptop,
  plug: Plug,
  repeat: Repeat,
  "shopping-bag": ShoppingBag,
  "shopping-basket": ShoppingBasket,
  smartphone: Smartphone,
  sparkles: Sparkles,
  store: Store,
  "trending-up": TrendingUp,
  "undo-2": Undo2,
  utensils: Utensils,
  transfer: ArrowLeftRight,
};

export const ICON_NAMES = Object.keys(ICONS).filter((k) => k !== "transfer");

/** Monochrome ink glyph in a parchment circle. Perk has one accent, so categories are told apart by glyph and name. */
export function CategoryIcon({
  name,
  size = "md",
  tone = "parchment",
  className,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  tone?: "parchment" | "white" | "lime";
  className?: string;
}) {
  const Icon = ICONS[name ?? "circle"] ?? Circle;
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const glyph = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-[18px]";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-ink",
        tone === "parchment" && "bg-parchment",
        tone === "white" && "bg-white",
        tone === "lime" && "bg-lime",
        box,
        className,
      )}
    >
      <Icon className={glyph} strokeWidth={1.5} />
    </span>
  );
}
