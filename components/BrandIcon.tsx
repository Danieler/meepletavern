import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Bookmark,
  Building2,
  CalendarDays,
  Clock3,
  Crown,
  Dices,
  FileText,
  Flame,
  Gauge,
  LayoutGrid,
  MessageSquareText,
  Search,
  Settings2,
  SlidersHorizontal,
  Star,
  Tag,
  Trophy,
  UserRound,
  Users
} from "lucide-react";

export type BrandIconName =
  | "book"
  | "bookmark"
  | "building"
  | "calendar"
  | "chat"
  | "clock"
  | "crown"
  | "dice"
  | "document"
  | "flame"
  | "gauge"
  | "grid"
  | "meeple"
  | "search"
  | "settings"
  | "sliders"
  | "star"
  | "tag"
  | "trophy"
  | "user"
  | "users";

type BrandIconProps = {
  name: BrandIconName;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const iconMap: Record<BrandIconName, LucideIcon> = {
  book: BookOpenText,
  bookmark: Bookmark,
  building: Building2,
  calendar: CalendarDays,
  chat: MessageSquareText,
  clock: Clock3,
  crown: Crown,
  dice: Dices,
  document: FileText,
  flame: Flame,
  gauge: Gauge,
  grid: LayoutGrid,
  meeple: Users,
  search: Search,
  settings: Settings2,
  sliders: SlidersHorizontal,
  star: Star,
  tag: Tag,
  trophy: Trophy,
  user: UserRound,
  users: Users
};

export function BrandIcon({
  name,
  size = 20,
  className = "",
  "aria-hidden": ariaHidden = true
}: BrandIconProps) {
  const Icon = iconMap[name];

  return (
    <span
      aria-hidden={ariaHidden}
      className={`inline-flex shrink-0 items-center justify-center overflow-visible align-middle leading-none ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Icon
        size={size}
        strokeWidth={2.1}
        absoluteStrokeWidth
        className="block"
      />
    </span>
  );
}
