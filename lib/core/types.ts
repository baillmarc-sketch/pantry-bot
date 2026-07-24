// Mise core types — framework-free. No React, no fetch, no AI imports here.
// These are the shapes the pure engine reads. The view and the DB adapters map to them.

export type Location =
  | 'fridge'
  | 'freezer'
  | 'pantry'
  | 'spice'
  | 'counter'
  | 'bar'
  | 'unknown';

export type Actor = 'marc' | 'anna' | 'system';

/** What an InventoryEvent represents. The log is the source of truth (event-sourced). */
export type EventType =
  | 'added'
  | 'restocked'
  | 'consumed'
  | 'discarded'
  | 'expired'
  | 'moved' // location/metadata change, quantity_change = 0
  | 'edited'; // metadata change, quantity_change = 0

export type EventSource = 'receipt' | 'fridge_scan' | 'manual' | 'recipe' | 'meal_scan';

/**
 * InventoryItem — identity + latest-known metadata ONLY.
 * There is deliberately no canonical `quantity` column: quantity is DERIVED from
 * the event stream. See lib/core/inventory.ts.
 */
export interface InventoryItem {
  id: string;
  household_id: string;
  normalized_name: string;
  display_name: string;
  category: string;
  unit: string;
  location: Location;
  brand?: string | null;
  package_size?: string | null;
  /** ISO date (YYYY-MM-DD). When unknown, spoilage falls back to created_at, conservatively. */
  purchase_date?: string | null;
  /** ISO date (YYYY-MM-DD). Triggers the after-opened clock. */
  opened_date?: string | null;
  /** ISO date (YYYY-MM-DD). A label/user "best by" date — trusted OVER the shelf-life table. */
  best_by?: string | null;
  source: EventSource;
  /** 0..1 — how sure we are about the parse/metadata. null when not applicable. */
  confidence_score?: number | null;
  notes?: string | null;
  /** On the household "things we like" list. Survives running out (product, not stock). */
  liked?: boolean;
  /** Free-form searchable tags (brand line, prep notes, aliases). */
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * InventoryEvent — THE SOURCE OF TRUTH.
 * Append-only. Concurrent edits from two phones become two appended events that
 * reconcile by summation, never one client clobbering the other.
 */
export interface InventoryEvent {
  id: string;
  item_id: string;
  household_id: string;
  event_type: EventType;
  /** Signed. + for added/restocked, - for consumed/discarded/expired, 0 for moved/edited. */
  quantity_change: number;
  reason?: string | null;
  source: EventSource;
  actor: Actor;
  /** ISO timestamp. Used for "latest wins" on metadata and for monotonic ordering. */
  created_at: string;
}

export interface RecipeIngredient {
  name: string;
  normalized_name?: string;
  quantity?: number | null;
  unit?: string | null;
  /** Pantry/seasoning items we assume on hand and won't penalize as "missing" when true. */
  assumed_staple?: boolean;
}

export interface RecipeInput {
  id: string;
  title: string;
  servings: number;
  /** minutes */
  time_estimate: number;
  /** How involved it is — 'easy' weeknight vs. 'involved' project (fresh pasta, injera).
   *  Optional; inferred from technique/steps when absent (see lib/core/effort.ts). */
  effort?: 'easy' | 'involved';
  ingredients: RecipeIngredient[];
  /** 0..1 — how well it keeps / reheats as leftovers. */
  leftover_score?: number;
  /** Optional tags the ranker/taste engine can read (e.g. 'asian', 'one-pan'). */
  tags?: string[];
  /** Explicit finishing move — overrides the taste engine's guess when set. */
  finishing_move?: string;
  /** Ordered method steps, shown as a numbered list on the recipe card. */
  steps?: string[];
  /** Free-form method/notes for saved (user-authored) recipes. */
  notes?: string;
  /** True for recipes the household saved themselves (vs. generated). */
  saved?: boolean;
  /** 'food' (default) or 'cocktail' — routes it to the Kitchen or the Bar. */
  kind?: 'food' | 'cocktail';
  /** Cocktail extras. */
  glass?: string;
  method?: string;
  garnish?: string;
  /** Whose favorite it is, for the Bar. */
  favorite_of?: 'marc' | 'anna' | 'both';
  /** Per-serving macros. Estimates are labeled as such — never presented as exact. */
  nutrition?: NutritionInfo;
}

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbs_g: number;
  sugar_g: number;
  fat_g: number;
  fiber_g?: number;
  sat_fat_g?: number;
  sodium_mg?: number;
  /** Where the numbers came from — drives the "≈ estimated" labeling in the UI. */
  basis: 'estimate' | 'label' | 'usda' | 'ai';
}
