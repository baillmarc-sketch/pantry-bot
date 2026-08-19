// Pure parser: turns the "add a recipe" form fields into a RecipeInput.
// No storage, no React — unit-testable.

import type { RecipeInput, RecipeIngredient } from '../core/types';
import { normalizeName } from '../core/normalize';

export interface RecipeFormInput {
  title: string;
  servings?: number | string;
  time_estimate?: number | string;
  /** One ingredient per line, or comma-separated. */
  ingredients: string;
  /** Comma-separated tags. */
  tags?: string;
  finishing_move?: string;
  leftover_score?: number;
  notes?: string;
  /** Method — one step per line (NOT split on commas; steps contain commas). */
  steps?: string;
  effort?: 'easy' | 'involved';
}

export interface ParseResult {
  ok: boolean;
  errors: string[];
  recipe?: RecipeInput;
}

function slugify(s: string): string {
  return (
    normalizeName(s).name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'recipe'
  );
}

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function splitList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Lines only — steps keep their commas. */
function splitLines(s: string): string[] {
  return s
    .split(/\r?\n+/)
    .map((x) => x.trim().replace(/^\d+[.)]\s*/, '')) // strip a leading "1." if pasted
    .filter(Boolean);
}

/** Validate + build. `id` is injected so the caller controls uniqueness. */
export function parseRecipeForm(form: RecipeFormInput, id: string): ParseResult {
  const errors: string[] = [];
  const title = form.title.trim();
  if (!title) errors.push('Give it a title.');

  const ingLines = splitList(form.ingredients);
  if (ingLines.length === 0) errors.push('Add at least one ingredient.');

  if (errors.length) return { ok: false, errors };

  const ingredients: RecipeIngredient[] = ingLines.map((line) => {
    const name = line.trim();
    return { name, normalized_name: normalizeName(name).name };
  });

  const recipe: RecipeInput = {
    id: `saved-${slugify(title)}-${id}`,
    title,
    servings: toInt(form.servings, 2),
    time_estimate: toInt(form.time_estimate, 30),
    ingredients,
    leftover_score: typeof form.leftover_score === 'number' ? form.leftover_score : 0.5,
    saved: true,
    tags: form.tags ? splitList(form.tags) : undefined,
    finishing_move: form.finishing_move?.trim() || undefined,
    notes: form.notes?.trim() || undefined,
    ...(form.steps && splitLines(form.steps).length ? { steps: splitLines(form.steps) } : {}),
    ...(form.effort ? { effort: form.effort } : {}),
  };

  return { ok: true, errors: [], recipe };
}
