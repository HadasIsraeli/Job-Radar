import { connection } from "next/server";
import Link from "next/link";
import { listRuns } from "@/lib/db/runs";
import { formatRelativeTime } from "@/lib/time";

export default async function RunsPage() {
  await connection();
  const runs = await listRuns();

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">יומן ריצות</h1>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← חזרה למשרות
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 flex-1">
        {runs.length === 0 && (
          <p className="text-neutral-500 text-center py-12">עדיין לא רצה סריקה.</p>
        )}

        <ul className="space-y-4">
          {runs.map((run) => (
            <li key={run.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{formatRelativeTime(run.startedAt)}</span>
                <span className="text-sm text-neutral-500">{run.totalMatched} משרות תואמות</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs">
                    <th className="text-right font-normal py-1">מקור</th>
                    <th className="text-right font-normal py-1">נסרקו</th>
                    <th className="text-right font-normal py-1">התאימו</th>
                    <th className="text-right font-normal py-1">שגיאות</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(run.perSource).map(([source, stats]) => (
                    <tr key={source} className="border-t border-neutral-100">
                      <td className="py-1">{source}</td>
                      <td className="py-1">{stats.fetched}</td>
                      <td className="py-1">{stats.matched}</td>
                      <td className="py-1 text-red-600">
                        {stats.errors.length > 0 ? stats.errors.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
