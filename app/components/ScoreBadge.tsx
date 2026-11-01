export function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 80
      ? "bg-emerald-600 text-white"
      : score >= 70
        ? "bg-amber-500 text-white"
        : "bg-neutral-400 text-white";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${style} h-10 w-10 text-sm font-bold shrink-0`}
    >
      {score}
    </span>
  );
}
