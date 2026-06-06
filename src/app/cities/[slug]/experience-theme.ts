import { Ticket, Utensils, Hotel } from "lucide-react";

export type ExperienceTabId = "landmarks" | "restaurants" | "hotels";

export const EXPERIENCE_TABS = [
  {
    id: "landmarks",
    label: "Landmarks",
    icon: Ticket,
    activeText: "text-accent",
    activeBg: "bg-accent-soft",
    activeBorder: "border-accent/20",
    activeCount: "bg-accent/15 text-accent",
  },
  {
    id: "restaurants",
    label: "Dining",
    icon: Utensils,
    activeText: "text-cat-dining",
    activeBg: "bg-cat-dining-soft",
    activeBorder: "border-[color:color-mix(in_oklab,var(--color-cat-dining)_20%,transparent)]",
    activeCount: "bg-[color:var(--color-cat-dining-soft)] text-cat-dining",
  },
  {
    id: "hotels",
    label: "Stays",
    icon: Hotel,
    activeText: "text-cat-stays",
    activeBg: "bg-cat-stays-soft",
    activeBorder: "border-[color:color-mix(in_oklab,var(--color-cat-stays)_20%,transparent)]",
    activeCount: "bg-[color:var(--color-cat-stays-soft)] text-cat-stays",
  },
] as const;

export const EXPERIENCE_PRICE_LEVEL_LABELS = new Map<string, string>([
  ["PRICE_LEVEL_FREE", "Free"],
  ["PRICE_LEVEL_INEXPENSIVE", "$"],
  ["PRICE_LEVEL_MODERATE", "$$"],
  ["PRICE_LEVEL_EXPENSIVE", "$$$"],
  ["PRICE_LEVEL_VERY_EXPENSIVE", "$$$$"],
]);

export const EXPERIENCE_PRICE_LEVELS = [
  { id: "PRICE_LEVEL_INEXPENSIVE", label: "$" },
  { id: "PRICE_LEVEL_MODERATE", label: "$$" },
  { id: "PRICE_LEVEL_EXPENSIVE", label: "$$$" },
  { id: "PRICE_LEVEL_VERY_EXPENSIVE", label: "$$$$" },
] as const;

export interface ExperienceCategoryColor {
  hover: string;
  badge: string;
  icon: string;
  iconBg: string;
  dot: string;
  save: string;
  saveHover: string;
  note: string;
  noteLabel: string;
  noteBtn: string;
  focus: string;
  moreHover: string;
  star: string;
}

export function getExperienceCategoryColor(activeTab: ExperienceTabId): ExperienceCategoryColor {
  switch (activeTab) {
    case "restaurants":
      return {
        hover: "hover:border-emerald-500/15",
        badge: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400/90",
        icon: "text-emerald-500 dark:text-emerald-400/70",
        iconBg: "border-emerald-500/15 bg-emerald-500/10",
        dot: "bg-emerald-500/40",
        save: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300",
        saveHover: "hover:border-emerald-500/20",
        note: "border-emerald-500/15 bg-emerald-500/5",
        noteLabel: "text-emerald-500 dark:text-emerald-400/80",
        noteBtn:
          "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/30",
        focus: "focus:border-emerald-500/40 focus:ring-emerald-500/20",
        moreHover: "hover:border-emerald-500/15",
        star: "fill-emerald-400 text-emerald-400",
      };
    case "hotels":
      return {
        hover: "hover:border-sky-500/15",
        badge: "border-sky-500/15 bg-sky-500/10 text-sky-600 dark:text-sky-400/90",
        icon: "text-sky-500 dark:text-sky-400/70",
        iconBg: "border-sky-500/15 bg-sky-500/10",
        dot: "bg-sky-500/40",
        save: "border-sky-500/25 bg-sky-500/10 text-sky-500 dark:text-sky-300",
        saveHover: "hover:border-sky-500/20",
        note: "border-sky-500/15 bg-sky-500/5",
        noteLabel: "text-sky-500 dark:text-sky-400/80",
        noteBtn:
          "border-sky-500/30 bg-sky-500/20 text-sky-600 dark:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/30",
        focus: "focus:border-sky-500/40 focus:ring-sky-500/20",
        moreHover: "hover:border-sky-500/15",
        star: "fill-sky-400 text-sky-400",
      };
    default:
      return {
        hover: "hover:border-orange-500/15",
        badge: "border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-400/90",
        icon: "text-orange-500 dark:text-orange-400/70",
        iconBg: "border-orange-500/15 bg-orange-500/10",
        dot: "bg-orange-500/40",
        save: "border-orange-500/25 bg-orange-500/10 text-orange-500 dark:text-orange-300",
        saveHover: "hover:border-orange-500/20",
        note: "border-orange-500/15 bg-orange-500/5",
        noteLabel: "text-orange-500 dark:text-orange-400/80",
        noteBtn:
          "border-orange-500/30 bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/30",
        focus: "focus:border-orange-500/40 focus:ring-orange-500/20",
        moreHover: "hover:border-orange-500/15",
        star: "fill-amber-400 text-amber-400",
      };
  }
}
