// Hebrew relative time, with the dual forms Hebrew actually uses for 2
// (שעתיים/יומיים/שבועיים) rather than "לפני 2 שעות" which reads as translated.
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return "לפני רגע";
  if (diffMinutes < 60) return diffMinutes === 1 ? "לפני דקה" : `לפני ${diffMinutes} דקות`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (diffHours === 1) return "לפני שעה";
    if (diffHours === 2) return "לפני שעתיים";
    return `לפני ${diffHours} שעות`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "אתמול";
  if (diffDays === 2) return "לפני יומיים";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "לפני שבוע";
  if (diffWeeks === 2) return "לפני שבועיים";
  return `לפני ${diffWeeks} שבועות`;
}
