// Entry point for the GitHub Actions daily cron (see
// .github/workflows/daily-scan.yml). Runs as a plain script rather than
// through the deployed /api/cron route: a full scan can take well past
// most hosting platforms' serverless function time limits once there's a
// real backlog of unanalyzed jobs, while a GitHub Actions job can run for
// hours. /api/cron still exists for a quick manual trigger.
import { config } from "dotenv";
config({ path: ".env.local" });
import { runDailyScan } from "../lib/pipeline";

runDailyScan()
  .then((result) => {
    console.log(`Daily scan done. ${result.totalMatched} jobs matched.`);
  })
  .catch((err) => {
    console.error("Daily scan failed:", err);
    process.exit(1);
  });
