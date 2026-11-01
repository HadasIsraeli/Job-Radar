import type { Requirement } from "./types";

const TYPE_WEIGHT: Record<Requirement["type"], number> = { must: 3, nice: 1 };
const MET_VALUE: Record<Requirement["met"], number> = { full: 1, partial: 0.5, none: 0 };

// The score is computed from the model's own requirement-by-requirement
// mapping, not asked of the model directly — this keeps it deterministic,
// reproducible, and auditable against the `requirements` breakdown shown
// in the UI, rather than a "gut feeling" number the model could vary on
// a re-run of the same input.
export function computeScore(requirements: Requirement[]): number {
  if (requirements.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const req of requirements) {
    const weight = TYPE_WEIGHT[req.type];
    weightedSum += weight * MET_VALUE[req.met];
    totalWeight += weight;
  }
  return Math.round((weightedSum / totalWeight) * 100);
}
