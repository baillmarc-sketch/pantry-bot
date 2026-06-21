// The AI seam. The whole app builds and tests against this interface; the real
// Anthropic adapter (Phase 2) drops in behind it with zero view changes.
//
// Architectural rule: the AI is a swappable ADAPTER, not the brain. The pure
// engine (lib/core) never imports this.

import type { Location, RecipeInput } from '../core/types.js';

export interface ParsedItem {
  normalized_name: string;
  display_name: string;
  category: string;
  unit: string;
  quantity: number;
  location: Location;
  brand?: string | null;
  package_size?: string | null;
  /** 0..1 parse confidence. Low confidence -> route to manual confirm. */
  confidence: number;
}

export interface ReceiptParseResult {
  items: ParsedItem[];
  /** Raw model/fixture output for audit; never trusted blindly. */
  raw: unknown;
}

/** A fridge photo can only PROPOSE presence. It never deletes inventory. */
export type PresenceProposal = 'still_present' | 'looks_low' | 'cannot_see';

export interface FridgeObservation {
  normalized_name: string;
  display_name: string;
  proposal: PresenceProposal;
  confidence: number;
}

export interface FridgeParseResult {
  observations: FridgeObservation[];
  raw: unknown;
}

export interface SuggestRecipesInput {
  /** Current derived inventory, names + spoilage status, passed for grounding. */
  pantry: { normalized_name: string; display_name: string; status: string }[];
  /** Max recipes to return. */
  count?: number;
}

export interface AIProvider {
  readonly name: string;
  parseReceipt(input: { imageBase64?: string; text?: string }): Promise<ReceiptParseResult>;
  parseFridge(input: { imageBase64: string }): Promise<FridgeParseResult>;
  suggestRecipes(input: SuggestRecipesInput): Promise<RecipeInput[]>;
}
