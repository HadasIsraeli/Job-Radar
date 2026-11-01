import { z } from "zod";
import searchConfig from "@/data/search-config.json";
import { createAshbySource } from "./ashby";
import { createGreenhouseSource } from "./greenhouse";
import { createLeverSource } from "./lever";
import { createSerpApiSource } from "./serpapi";
import { createSmartRecruitersSource } from "./smartrecruiters";
import { createWorkableSource } from "./workable";
import type { Source } from "./types";

const companySchema = z.object({
  name: z.string(),
  ats: z.enum(["greenhouse", "lever", "ashby", "comeet", "workable", "smartrecruiters"]).nullable(),
  board_id: z.string().nullable(),
});

const searchConfigSchema = z.object({
  companies: z.array(companySchema),
  target_titles: z.object({ en: z.array(z.string()) }),
  locations: z.object({ primary: z.array(z.string()) }),
});

// Builds one ATS Source per verified company in search-config.json.
// Companies with ats/board_id still null (unresolved, or deliberately
// excluded after a false-positive match) are skipped.
export function buildAtsSources(): Source[] {
  const { companies } = searchConfigSchema.parse(searchConfig);
  const sources: Source[] = [];
  for (const company of companies) {
    if (!company.ats || !company.board_id) continue;
    switch (company.ats) {
      case "greenhouse":
        sources.push(createGreenhouseSource(company.board_id));
        break;
      case "lever":
        sources.push(createLeverSource(company.board_id));
        break;
      case "ashby":
        sources.push(createAshbySource(company.board_id));
        break;
      case "smartrecruiters":
        sources.push(createSmartRecruitersSource(company.board_id, company.name));
        break;
      case "workable":
        sources.push(createWorkableSource(company.board_id));
        break;
      case "comeet":
        // Comeet board ids are opaque UIDs that can't be guessed; skipped
        // until one is added to search-config.json by hand.
        break;
    }
  }
  return sources;
}

// One SerpAPI Google Jobs source per target title, searched against the
// first primary location (Israel). Each title is a separate query because
// SerpAPI doesn't support title OR-queries reliably.
export function buildSerpApiSources(apiKey: string): Source[] {
  const { target_titles, locations } = searchConfigSchema.parse(searchConfig);
  const location = locations.primary[locations.primary.length - 1] ?? "Israel";
  return target_titles.en.map((title) => createSerpApiSource(apiKey, `${title} Israel`, location));
}
