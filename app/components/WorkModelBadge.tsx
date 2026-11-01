import type { WorkModel } from "@/lib/db/types";

const LABEL: Record<WorkModel, string> = {
  office: "משרד",
  hybrid: "היברידי",
  remote: "מרחוק",
  unknown: "לא צויין",
};

const STYLE: Record<WorkModel, string> = {
  office: "bg-neutral-100 text-neutral-700",
  hybrid: "bg-amber-100 text-amber-800",
  remote: "bg-emerald-100 text-emerald-800",
  unknown: "bg-neutral-50 text-neutral-400",
};

export function WorkModelBadge({ workModel }: { workModel: WorkModel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[workModel]}`}
    >
      {LABEL[workModel]}
    </span>
  );
}
