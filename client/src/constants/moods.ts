export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const MOODS = [
  { key: "Great", color: "#2563eb" },
  { key: "Good", color: "#16a34a" },
  { key: "Okay", color: "#eab308" },
  { key: "Bad", color: "#ef4444" },
  { key: "Awful", color: "#000000" },
] as const;
export type TMonthLabel = (typeof MONTHS)[number];

export type TMoodKey = (typeof MOODS)[number]["key"];
export type TMoodConfig = (typeof MOODS)[number];
