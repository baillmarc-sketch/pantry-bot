// MockAIProvider — deterministic fixtures, $0 of API credit. Build, test, and demo
// the entire loop against THIS. The real adapter implements the same interface.

import type {
  AIProvider,
  ReceiptParseResult,
  FridgeParseResult,
  SuggestRecipesInput,
} from './provider';
import type { RecipeInput } from '../core/types';
import { normalizeName } from '../core/normalize';

/** A canned receipt as raw lines — mirrors what OCR would hand us. */
const CANNED_RECEIPT_LINES = [
  'ORG CUKES 3CT',
  'BNLS CHX THIGH 2.1LB',
  'ATLANTIC SALMON 0.9LB',
  'LG EGGS DOZEN',
  'SWT POTATO 2EA',
];

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async parseReceipt(input: {
    imageBase64?: string;
    text?: string;
  }): Promise<ReceiptParseResult> {
    const lines = input.text
      ? input.text.split('\n').map((l) => l.trim()).filter(Boolean)
      : CANNED_RECEIPT_LINES;

    const items = lines.map((line) => {
      const { name, matched } = normalizeName(line);
      return {
        normalized_name: name,
        display_name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
        category: 'unsorted',
        unit: 'unit',
        quantity: 1,
        location: 'fridge' as const,
        brand: null,
        package_size: null,
        // Dictionary hits are high-confidence; misses are flagged for manual confirm.
        confidence: matched ? 0.95 : 0.5,
      };
    });

    return { items, raw: { source: 'mock', lines } };
  }

  async parseFridge(_input: { imageBase64: string }): Promise<FridgeParseResult> {
    // Propose-only: a photo never deletes. Removal requires a human tap.
    return {
      observations: [
        { normalized_name: 'salmon', display_name: 'Salmon', proposal: 'still_present', confidence: 0.8 },
        { normalized_name: 'zucchini', display_name: 'Zucchini', proposal: 'looks_low', confidence: 0.6 },
        { normalized_name: 'cucumber', display_name: 'Cucumber', proposal: 'cannot_see', confidence: 0.4 },
      ],
      raw: { source: 'mock' },
    };
  }

  async suggestRecipes(input: SuggestRecipesInput): Promise<RecipeInput[]> {
    const count = input.count ?? 5;
    const all: RecipeInput[] = [
      {
        id: 'r-salmon-rice',
        title: 'Miso-glazed salmon with sesame rice',
        servings: 2,
        time_estimate: 25,
        leftover_score: 0.4,
        tags: ['asian', 'one-pan'],
        ingredients: [
          { name: 'salmon' },
          { name: 'rice dry', assumed_staple: true },
          { name: 'miso', assumed_staple: true },
          { name: 'soy sauce', assumed_staple: true },
          { name: 'scallion' },
        ],
      },
      {
        id: 'r-chicken-sheet',
        title: 'Sheet-pan chicken thighs, sweet potato & zucchini',
        servings: 2,
        time_estimate: 40,
        leftover_score: 0.7,
        tags: ['med', 'sheet-pan'],
        ingredients: [
          { name: 'chicken thighs' },
          { name: 'sweet potato' },
          { name: 'zucchini' },
          { name: 'lemon', assumed_staple: true },
          { name: 'olive oil', assumed_staple: true },
        ],
      },
      {
        id: 'r-cucumber-salad',
        title: 'Smashed cucumber salad',
        servings: 2,
        time_estimate: 10,
        leftover_score: 0.2,
        tags: ['asian', 'side'],
        ingredients: [
          { name: 'cucumber' },
          { name: 'rice vinegar', assumed_staple: true },
          { name: 'chili crisp', assumed_staple: true },
          { name: 'garlic', assumed_staple: true },
        ],
      },
    ];
    return all.slice(0, count);
  }
}
