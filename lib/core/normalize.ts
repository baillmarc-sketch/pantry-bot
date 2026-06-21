// The $0 cost layer. Most receipt/scan text resolves to a canonical name here,
// with no model call. Only what escapes this dictionary should ever reach the AI.

import aliasesData from '../data/aliases.json';

const ALIASES: Record<string, string> = aliasesData.aliases;

/** Lowercase, collapse whitespace, strip surrounding punctuation/qty noise. */
export function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[#*"'`]/g, ' ')
    .replace(/\b\d+(\.\d+)?\s?(oz|lb|lbs|g|kg|ct|pk|ea|x)\b/g, ' ') // qty/unit noise
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map messy text to a canonical normalized_name.
 * Returns { name, matched } so callers know whether the dictionary handled it
 * (matched=true => $0 path) or whether escalation to a model is warranted.
 */
export function normalizeName(raw: string): { name: string; matched: boolean } {
  const cleaned = cleanText(raw);
  if (!cleaned) return { name: '', matched: false };

  // Exact alias hit.
  if (ALIASES[cleaned]) return { name: ALIASES[cleaned], matched: true };

  // Substring alias hit (e.g. "organic english cucumber 3ct" -> cucumber).
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (cleaned.includes(alias)) return { name: canonical, matched: true };
  }

  // No dictionary entry: pass the cleaned text through, flagged as unmatched.
  return { name: cleaned, matched: false };
}
