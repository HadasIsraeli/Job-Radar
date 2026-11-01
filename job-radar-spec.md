# Job Radar: אתר שסורק משרות יומי ומתאים אותן לקורות החיים שלי

> **איך להשתמש בקובץ:**
>
> 1. צרי תיקייה חדשה לפרויקט ושימי בה את הקובץ הזה ואת שני קובצי קורות החיים (`cv-en.pdf`, `cv-he.pdf`).
> 2. חברי את ה-MCPs שבחלק א' (לפני שמתחילים).
> 3. פתחי Claude Code בתיקייה, עברי ל-Plan Mode (Shift+Tab פעמיים) והדביקי את הפרומפט שבחלק ג'.
> 4. תני ל-Claude Code לבנות שלב אחרי שלב, ובדקי כל שלב לפני שממשיכים.

---

## חלק א': ה-MCPs לחיבור ב-Claude Code

חשוב להבין את ההבחנה הזו: **ה-MCPs עוזרים ל-Claude Code לבנות את המערכת, אבל המערכת עצמה לא רצה דרכם.** הסריקה היומית רצה כקוד רגיל (cron) שפונה ל-APIs. ה-MCPs נותנים ל-Claude Code גישה ישירה למסד הנתונים, לריפו, לדפדפן ולתיעוד עדכני, וכך הבנייה מהירה ומדויקת יותר.

| MCP                            | למה צריך אותו                                                                                                               | עדיפות     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Supabase MCP**               | יצירת טבלאות, מיגרציות, בדיקת נתונים ישירות מ-Claude Code                                                                   | חובה       |
| **GitHub MCP**                 | יצירת ריפו פרטי, Actions ל-cron, ניהול סודות                                                                                | חובה       |
| **Playwright MCP**             | בדיקת אתרי משרות ומבנה הדפים שלהם, ובדיקות E2E לדאשבורד                                                                     | חובה       |
| **Context7**                   | תיעוד עדכני של Next.js, Supabase, Anthropic SDK (מונע קוד מיושן)                                                            | מומלץ מאוד |
| **Vercel MCP** (או Render MCP) | דיפלוי וצפייה בלוגים. ל-Render יש לך כבר תוסף, ואפשר להריץ שם גם את ה-cron                                                  | מומלץ      |
| **Indeed MCP**                 | חיפוש משרות דרך Indeed, אם קיים endpoint שאפשר לחבר ל-Claude Code. החיבור שיש לך ב-claude.ai לא עובר אוטומטית ל-Claude Code | אופציונלי  |

פקודות חיבור לדוגמה (Claude Code יוודא את התחביר העדכני):

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add --transport http vercel https://mcp.vercel.com
```

**מפתחות API שתצטרכי להכין:**

- `ANTHROPIC_API_KEY`: למנוע ההתאמה (console.anthropic.com)
- Supabase: URL + service role key
- `SERPAPI_KEY` (או ספק דומה): ל-Google Jobs, שמאגד משרות מהרבה אתרים כולל לינקדאין
- Resend / Gmail: רק אם רוצים מייל יומי

---

## חלק ב': תכנון מפורט לפי שלבים

### ⚠️ שלוש נקודות מציאותיות לפני שמתחילים

1. **לינקדאין חוסמת סריקה ואוסרת אותה בתנאי השימוש.** לא כדאי לבנות על זה. החלופות: (א) Google Jobs דרך SerpAPI, שמציג הרבה משרות שמפורסמות גם בלינקדאין; (ב) פענוח מיילי Job Alerts של לינקדאין דרך Gmail API, שזה חוקי ועובד טוב.
2. **המקור הכי איכותי לשוק הישראלי הוא דפי הקריירה של החברות עצמן.** רוב הסטארטאפים בישראל משתמשים ב-Comeet, Greenhouse, Lever, Ashby או Workable, ולרובן יש API ציבורי עם תאריך פרסום מדויק. זה אמין יותר מסריקת לוחות דרושים.
3. **סף של 80% עלול להשאיר אותך עם מעט מאוד תוצאות**, בגלל המעבר מפיתוח לעיצוב: מנוע ההתאמה עלול לפספס ניסיון רלוונטי שלא נקרא "Designer". לכן התכנון כולל אזור "כמעט מתאים" (70–79%) שאפשר להציג או להסתיר, וכיול של המנוע בשבוע הראשון.

### שלב 0: הקמה

- ריפו **פרטי** ב-GitHub. הקורות חיים כוללים טלפון ומייל, אז לא מעלים אותם לריפו ציבורי.
- Next.js (App Router) + TypeScript + Tailwind, ו-Supabase כמסד נתונים.
- קובץ `.env.example` ו-`CLAUDE.md` עם כללי הפרויקט.

### שלב 1: פרופיל מועמדת

- המרת קורות החיים ל-`profile.json` מובנה: תפקידים, שנות ניסיון לפי תחום (עיצוב מול פיתוח), כישורים, כלים, השכלה, שפות, הישגים מספריים.
- זה המסמך שמנוע ההתאמה משווה אליו. כדאי לעבור עליו ידנית ולתקן.
- הגדרות חיפוש ב-`search-config.json`: תפקידי יעד, אזורים מועדפים, מילות מפתח לסינון, רשימת חברות.

### שלב 2: מקורות משרות (connectors)

כל מקור הוא מודול נפרד עם ממשק אחיד: `fetchJobs(since: Date) → RawJob[]`.

1. **ATS APIs**: Greenhouse, Lever, Ashby, Comeet, Workable, SmartRecruiters, עם רשימת חברות ישראליות שמתעדכנת בקובץ config.
2. **Google Jobs דרך SerpAPI**: שאילתות כמו "Product Designer Israel" ו-"UX Designer Tel Aviv", עם סינון ליום האחרון.
3. **Indeed**: דרך API או MCP, אם זמין.
4. **לוחות ישראליים** (AllJobs, Drushim, JobMaster): רק אחרי בדיקת robots.txt ותנאי שימוש, בקצב איטי, ורק אם יש RSS או מבנה יציב.
5. **אופציונלי:** פענוח מיילי התראות לינקדאין מ-Gmail.

### שלב 3: נרמול וסינון

- איחוד לפורמט אחד: חברה, תפקיד, מיקום, מודל עבודה (Office / Hybrid / Remote), תאריך פרסום, קישור ישיר, טקסט מלא.
- **סינון 24 שעות**: לפי תאריך הפרסום מהמקור. אם המקור לא מספק תאריך, לפי "נראה לראשונה" אצלנו.
- זיהוי מודל עבודה: קודם מהשדה המובנה, ואם אין, מהטקסט (hybrid, היברידי, "X ימים מהבית").
- דה-דופליקציה: אותה משרה מכמה מקורות נשמרת פעם אחת, עם כל הקישורים.

### שלב 4: מנוע התאמה (Claude API)

- **סינון ראשוני זול**: Haiku בודק רלוונטיות בסיסית (תחום, בכירות), כדי לא לשלם על ניתוח מלא של כל משרה.
- **ניתוח מלא**: Sonnet מפרק את המשרה לדרישות (חובה / יתרון), ממפה כל דרישה לראיה מהקורות חיים, ומחזיר JSON:
  ```json
  {
    "score": 84,
    "requirements": [
      { "text": "...", "type": "must", "met": "full|partial|none", "evidence": "..." }
    ],
    "strengths": ["..."],
    "gaps": ["..."],
    "how_to_close_gaps": ["..."],
    "seniority_fit": "..."
  }
  ```
- הציון מחושב מהמיפוי בנוסחה קבועה (דרישות חובה במשקל גבוה יותר), ולא כ"תחושת בטן" של המודל. כך הוא עקבי ובר-בדיקה.
- חוזקות ופערים בעברית, קונקרטיים ומבוססים על הקורות חיים.
- cache: משרה שכבר נותחה לא מנותחת שוב.

### שלב 5: דאשבורד

- **כרטיס או שורה לכל משרה:** שם חברה, שם משרה, מיקום, Office / Hybrid / Remote, קישור ישיר, ציון התאמה, זמן פרסום, מקור.
- **פאנל פירוט:** חוזקות, מה חסר, פירוק הדרישות (✓ / ◐ / ✗), ואיך לסגור את הפערים.
- **ניהול:** שמירה, "הגשתי", "לא רלוונטי" (וההחלטות האלה משמשות לכיול).
- תצוגה ברירת מחדל: היום, ציון ≥80, מסודר לפי ציון.

### שלב 6: חיפוש וקטגוריות

- **מלל חופשי:** Postgres full-text על כותרת, חברה ותיאור, בעברית ובאנגלית.
- **פילטרים:** תחום תפקיד (Product / UX / UI / UX Research / Design Systems / Front-end), בכירות, אזור או עיר, מודל עבודה, תעשייה (SaaS, ביטחון, בריאות, פינטק, AI), גודל או שלב חברה, טווח ציון, טווח תאריכים, מקור, סוג משרה (מלאה / חלקית / פרילנס), שפה נדרשת, כישור ספציפי (Figma, Design Systems...), וסטטוס (חדש / נשמר / הוגש / נדחה).
- הפילטרים נשמרים ב-URL, כך שאפשר לשמור חיפוש ולחזור אליו.

### שלב 7: תזמון והתראות

- GitHub Actions cron (או Render Cron Job) כל בוקר, למשל 07:00 שעון ישראל.
- לוג ריצה בדאשבורד: כמה משרות נסרקו מכל מקור, כמה התאימו, ושגיאות.
- אופציונלי: מייל יומי עם 5 המשרות המובילות.

### שלב 8: בדיקות, כיול ודיפלוי

- בדיקות יחידה ל-connectors ולנרמול, ובדיקת E2E לדאשבורד (Playwright).
- **כיול בשבוע הראשון:** לעבור על 20–30 משרות ידנית ולבדוק אם הציון תואם את השיפוט שלך, ולכוונן את הפרומפט או המשקלים בהתאם.
- דיפלוי ל-Vercel (או Render) עם הגנת סיסמה, כי זה אתר אישי.

**הערכת עלות:** כ-150–300 משרות ביום, עם סינון Haiku וניתוח Sonnet רק למשרות שעברו את הסינון. העלות צריכה להיות כמה דולרים בחודש, אבל כדאי לבדוק מול המחירון העדכני. ל-SerpAPI יש מכסה חינמית מוגבלת.

---

## חלק ג': הפרומפט להדבקה ב-Claude Code

הפרומפט כתוב באנגלית כי זה מניב קוד עקבי יותר. ממשק המשתמש וניתוחי ההתאמה יהיו בעברית.

```
You are building "Job Radar" — a personal web app that scans job sources daily, finds jobs
posted in the last 24 hours, scores how well I match each one against my CV, and shows the
results in a searchable dashboard.

## Context
- My CV is in this folder: cv-en.pdf and cv-he.pdf. Read both.
- I'm a Product Designer (UX/UI) based in Israel, with ~4 years combining UX/UI design,
  user research and front-end development (Angular, JS). Target roles: Product Designer,
  UX/UI Designer, UX Designer, UI Designer, Design Systems, and hybrid Design-Engineer roles.
- The full plan is in job-radar-spec.md (Part B). Follow its phases in order.

## Stack
- Next.js (App Router) + TypeScript + Tailwind, deployed to Vercel (or Render).
- Supabase (Postgres) for storage. Use the Supabase MCP for schema and migrations.
- Anthropic SDK for matching: claude-haiku-5-5 for cheap pre-filtering,
  claude-sonnet-5-5 for full analysis. Use structured JSON output.
- Daily job: GitHub Actions cron at 07:00 Asia/Jerusalem (handle DST), calling a protected
  API route or a standalone script.
- Use Context7 to check current docs before writing integration code. Do not rely on memory
  for API endpoints.

## Hard rules
- Private repo. Never commit the CV, API keys or .env. Add them to .gitignore.
- Do NOT scrape LinkedIn. Use legal sources only. For any scraped site, check robots.txt and
  terms first, rate-limit requests, and tell me before adding the site.
- Every source is a separate connector implementing: fetchJobs(since: Date): Promise<RawJob[]>.
  One failing source must never break the run. Log errors per source.

## Phase 1 — Candidate profile
Parse both CVs into profile.json (roles, years per discipline, skills, tools, education,
languages, quantified achievements). Show it to me for review before continuing.
Create search-config.json (target titles, keywords, locations, list of companies per ATS).

## Phase 2 — Sources (in this priority order)
1. Public ATS job-board APIs: Greenhouse, Lever, Ashby, Comeet, Workable, SmartRecruiters.
   Seed search-config.json with ~40 Israeli tech companies that are likely to hire product
   designers, and verify each one's board identifier actually works.
2. Google Jobs via SerpAPI (Israel, last day). Queries come from search-config.json.
3. Indeed (via its MCP or API, if available. Ask me first).
4. Israeli job boards (AllJobs, Drushim, JobMaster): investigate with Playwright MCP, report
   feasibility and legal status to me, and implement only after I approve.

## Phase 3 — Normalize, filter, dedupe
Normalized Job: id, company, title, location, city, work_model (office|hybrid|remote|unknown),
posted_at, first_seen_at, url (direct link to the posting), source[], description, seniority,
employment_type, industry, language_required.
- Keep only jobs posted in the last 24h (posted_at; fall back to first_seen_at).
- Detect work_model from structured fields first, then from text in English and Hebrew
  (e.g. "hybrid", "היברידי", "X days from home", "remote").
- Dedupe across sources by normalized company+title+location; merge their URLs.

## Phase 4 — Matching engine
- Haiku pre-filter: is this a design or design-adjacent role at a plausible seniority? Drop
  the rest.
- Sonnet analysis: extract requirements (must / nice-to-have). For each one, map evidence
  from profile.json and mark it full / partial / none. Count transferable experience
  honestly: front-end dev experience counts toward "work with engineers", "design systems",
  "technical understanding", but not toward "X years as a designer".
- Compute the score deterministically from the mapping (must = weight 3, nice = 1; full=1,
  partial=0.5, none=0). The model does not invent the number.
- Output, in Hebrew: strengths (concrete, tied to CV evidence), gaps (what's missing), and
  how_to_close_gaps (practical, e.g. which portfolio project or CV line to highlight).
- Store the analysis and never re-analyze the same job.
- Thresholds: ≥80 = "Match", 70–79 = "Near match" (hidden by default, one toggle to show).

## Phase 5 — Dashboard (Hebrew UI, RTL, responsive, clean and minimal)
- Job list with: company name, job title, location, work model badge
  (Office / Hybrid / Remote), direct link (opens the original posting), match score,
  posted time ("לפני 3 שעות"), source.
- Clicking a job opens a side panel with strengths, gaps, the requirement breakdown
  (✓ / ◐ / ✗ with evidence) and how to close the gaps.
- Actions per job: Save / Applied / Not relevant. Persist these in the DB.
- Default view: today, score ≥80, sorted by score.
- A "Runs" page: last run time, jobs fetched per source, matches, errors.
- Password-protect the whole site (simple auth; it's personal).

## Phase 6 — Search & filters
- Free-text search (Postgres full-text, Hebrew and English) across title, company and
  description.
- Filters: role category, seniority, region/city, work model, industry, company size/stage,
  score range, date range, source, employment type, language required, specific skill/tool,
  status. Filters live in the URL so searches can be saved and shared.

## Phase 7 — Scheduling
GitHub Actions daily cron with secrets set via the GitHub MCP. Make the run idempotent.
Optional (ask me): daily email digest of the top 5 matches.

## Phase 8 — Quality
Unit tests for connectors and normalization, plus a Playwright E2E test for the dashboard.
Add a "calibration" view: I mark whether a score feels right, so we can tune the weights.

## How to work with me
- Start in plan mode: show me the file structure, DB schema and phase plan before coding.
- Finish one phase at a time, show me what works (with real data), and wait for my OK
  before moving on.
- When something is uncertain (an API's terms, a company's board ID, a source's
  reliability), say so instead of guessing.
```
