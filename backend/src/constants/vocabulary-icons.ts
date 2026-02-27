const CATEGORY_ICON_MAP: Array<{ key: string; icon: string }> = [
  { key: "daily", icon: "clock" },
  { key: "routine", icon: "clock" },
  { key: "food", icon: "utensils" },
  { key: "drink", icon: "utensils" },
  { key: "work", icon: "briefcase" },
  { key: "career", icon: "briefcase" },
  { key: "home", icon: "home" },
  { key: "living", icon: "home" },
  { key: "health", icon: "heart" },
  { key: "body", icon: "heart" },
  { key: "travel", icon: "map-pin" },
  { key: "place", icon: "map-pin" },
  { key: "general", icon: "sparkle" }
];

export const categoryToIcon = (category: string): string => {
  const key = category.trim().toLowerCase();
  const match = CATEGORY_ICON_MAP.find((entry) => key.includes(entry.key));
  return match?.icon ?? "dot";
};
