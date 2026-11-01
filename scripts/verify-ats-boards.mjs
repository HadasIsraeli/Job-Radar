// Phase 2 maintenance tool: probes public ATS APIs for each company in
// data/search-config.json to find a working board/account slug, and writes
// the resolved ats+board_id back for any company not already resolved.
//
// IMPORTANT — this guesses slugs from the company name and only confirms
// that *some* board exists at that slug with open jobs, not that it's the
// right company. Short/generic slugs can collide with an unrelated ATS
// customer (e.g. "vast" matched an aerospace company, not VAST Data; "wiz"
// matched nothing real). After running this, spot-check a few job titles
// on each newly-resolved board (see a company's postings URL) before
// trusting it, especially for short or dictionary-word slugs.
//
// Usage: node scripts/verify-ats-boards.mjs
import { readFile, writeFile } from "node:fs/promises";

const CONFIG_PATH = new URL("../data/search-config.json", import.meta.url);
const DELAY_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugCandidates(name) {
  const cleanedFull = name
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim();
  const words = cleanedFull.split(/\s+/).filter(Boolean);
  const parenMatch = name.match(/\(([^)]+)\)/);
  const candidates = new Set();

  if (words.length > 0) {
    candidates.add(words.join("").toLowerCase());
    candidates.add(words.join("-").toLowerCase());
    candidates.add(words[0].toLowerCase());
  }
  if (parenMatch) {
    candidates.add(parenMatch[1].toLowerCase());
  }
  // Strip common corporate suffixes for a shorter guess, e.g.
  // "Papaya Global" -> "papaya", "Cato Networks" -> "cato".
  const suffixes = ["global", "networks", "security", "software", "data", "technologies", "labs"];
  if (words.length > 1 && suffixes.includes(words[words.length - 1].toLowerCase())) {
    candidates.add(words.slice(0, -1).join("").toLowerCase());
  }

  return [...candidates].filter((c) => c.length > 1);
}

async function probeJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Every probe below requires a non-empty jobs list: an empty result can't
// prove the slug is the right company (or, for SmartRecruiters, even a
// real company at all — it returns 200 with empty content for any slug),
// and an empty board is useless to the app regardless.

async function tryGreenhouse(slug) {
  const body = await probeJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
  if (body && Array.isArray(body.jobs) && body.jobs.length > 0) {
    return { ats: "greenhouse", board_id: slug, jobCount: body.jobs.length };
  }
  return null;
}

async function tryLever(slug) {
  const body = await probeJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (Array.isArray(body) && body.length > 0)
    return { ats: "lever", board_id: slug, jobCount: body.length };
  return null;
}

async function tryAshby(slug) {
  const body = await probeJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  if (body && Array.isArray(body.jobs) && body.jobs.length > 0) {
    return { ats: "ashby", board_id: slug, jobCount: body.jobs.length };
  }
  return null;
}

async function trySmartRecruiters(slug) {
  const body = await probeJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings`);
  if (body && Array.isArray(body.content) && body.content.length > 0) {
    return { ats: "smartrecruiters", board_id: slug, jobCount: body.content.length };
  }
  return null;
}

async function tryWorkable(slug) {
  const body = await probeJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}`);
  if (body && Array.isArray(body.jobs) && body.jobs.length > 0) {
    return { ats: "workable", board_id: slug, jobCount: body.jobs.length };
  }
  return null;
}

const PROBES = [tryGreenhouse, tryLever, tryAshby, trySmartRecruiters, tryWorkable];

async function resolveCompany(name) {
  for (const slug of slugCandidates(name)) {
    for (const probe of PROBES) {
      const hit = await probe(slug);
      await sleep(DELAY_MS);
      if (hit) return hit;
    }
  }
  return null;
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const results = [];
  for (const company of config.companies) {
    if (company.ats && company.board_id) {
      results.push({
        name: company.name,
        resolved: { ats: company.ats, board_id: company.board_id },
      });
      continue;
    }
    const resolved = await resolveCompany(company.name);
    if (resolved) {
      company.ats = resolved.ats;
      company.board_id = resolved.board_id;
    }
    results.push({ name: company.name, resolved });
    process.stderr.write(
      `${company.name}: ${resolved ? `${resolved.ats}/${resolved.board_id} (${resolved.jobCount} jobs)` : "not found"}\n`,
    );
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  const resolvedCount = results.filter((r) => r.resolved).length;
  process.stderr.write(`\nResolved ${resolvedCount}/${results.length} companies.\n`);
}

main();
