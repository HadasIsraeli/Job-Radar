import { decode } from "html-entities";

// Some ATS APIs (Greenhouse, Comeet) return job descriptions as HTML whose
// own tags are themselves entity-encoded (e.g. "&lt;p&gt;..." as literal
// text), so this decodes twice before stripping tags, then collapses the
// resulting whitespace.
export function htmlToText(html: string): string {
  const decoded = decode(decode(html));
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
