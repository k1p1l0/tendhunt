import { Swords, MapPin, Tag } from "lucide-react";

export const NOTIFICATION_TYPE_ICONS = {
  NEW_CONTRACT: Swords,
  NEW_REGION: MapPin,
  NEW_SECTOR: Tag,
} as const;

export const NOTIFICATION_TYPE_COLORS = {
  NEW_CONTRACT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  NEW_REGION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  NEW_SECTOR: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

export const NOTIFICATION_TYPE_LABELS = {
  NEW_CONTRACT: "New Contract",
  NEW_REGION: "New Region",
  NEW_SECTOR: "New Sector",
} as const;
