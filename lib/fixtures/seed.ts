// Demo seed data. Stands in for Supabase until "tech" phase wires the DB.
// Dates are relative to *now* so the demo always shows a live spread of statuses.
//
// This is mock/demo data, clearly labeled — not invented facts presented as real.

import type { InventoryItem, InventoryEvent } from '../core/types';

const DAY = 86_400_000;
function isoDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
}
function isoTime(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY).toISOString();
}

interface SeedSpec {
  id: string;
  normalized_name: string;
  display_name: string;
  category: string;
  unit: string;
  location: InventoryItem['location'];
  purchasedDaysAgo: number;
  openedDaysAgo?: number;
  qty: number;
  brand?: string;
  package_size?: string;
  liked?: boolean;
  tags?: string[];
  notes?: string;
}

const SPECS: SeedSpec[] = [
  // salmon: fridge 2d shelf -> bought 1d ago => "use today/soon" (urgent)
  { id: 'i-salmon', normalized_name: 'salmon', display_name: 'Atlantic salmon', category: 'seafood', unit: 'fillet', location: 'fridge', purchasedDaysAgo: 1, qty: 2 },
  // zucchini: fridge 5d -> bought 4d ago => "use today"
  { id: 'i-zucchini', normalized_name: 'zucchini', display_name: 'Zucchini', category: 'produce', unit: 'unit', location: 'fridge', purchasedDaysAgo: 4, qty: 3 },
  // cucumber: fridge 5d -> bought 3d ago => "use soon"
  { id: 'i-cucumber', normalized_name: 'cucumber', display_name: 'Cucumbers', category: 'produce', unit: 'unit', location: 'fridge', purchasedDaysAgo: 3, qty: 3 },
  // chicken thighs: fridge 2d -> bought today => "use soon"
  { id: 'i-chicken', normalized_name: 'chicken thighs', display_name: 'Chicken thighs', category: 'meat', unit: 'lb', location: 'fridge', purchasedDaysAgo: 0, qty: 2 },
  // sweet potato: pantry 14d -> bought 2d ago => "fresh"
  { id: 'i-sweetpotato', normalized_name: 'sweet potato', display_name: 'Sweet potatoes', category: 'produce', unit: 'unit', location: 'pantry', purchasedDaysAgo: 2, qty: 2 },
  // eggs: fridge 28d -> bought 5d ago => "fresh"
  { id: 'i-eggs', normalized_name: 'eggs', display_name: 'Eggs (dozen)', category: 'dairy_eggs', unit: 'dozen', location: 'fridge', purchasedDaysAgo: 5, qty: 1 },
  // aged cheese: opened recently -> pulls earlier
  { id: 'i-cheese', normalized_name: 'aged cheese', display_name: 'Aged gouda', category: 'dairy_eggs', unit: 'wedge', location: 'fridge', purchasedDaysAgo: 20, openedDaysAgo: 19, qty: 1 },
  // fresh herbs: short-lived -> "past estimate"
  { id: 'i-herbs', normalized_name: 'fresh herbs', display_name: 'Cilantro', category: 'produce', unit: 'bunch', location: 'fridge', purchasedDaysAgo: 7, qty: 1 },
  // --- Things we like (scanned from labels) ---
  {
    id: 'i-razor-clams',
    normalized_name: 'razor clams',
    display_name: 'Razor Clams in Garlic Sauce with Sea Spaghetti',
    category: 'tinned fish',
    unit: 'tin',
    location: 'pantry',
    purchasedDaysAgo: 10,
    qty: 1,
    brand: 'Porto-Muíños',
    package_size: '3.2 oz (90g)',
    liked: true,
    tags: ['tinned fish', 'conservas', 'sea vegetables', 'razor clams', 'garlic sauce', 'sea spaghetti', 'seaweed', 'spanish', 'galician'],
    notes: 'Scanned from label. Porto-Muíños "Sea Vegetables" line. Razor clams in garlic sauce with sea spaghetti (seaweed).',
  },
  {
    id: 'i-dill-crackers',
    normalized_name: 'snack crackers',
    display_name: 'Snacker Crackers — Dill Pickle',
    category: 'crackers',
    unit: 'tub',
    location: 'pantry',
    purchasedDaysAgo: 8,
    qty: 1,
    package_size: '8.5 oz (241g)',
    liked: true,
    tags: ['crackers', 'snack', 'dill pickle', 'pickle', 'the perfect snack cracker'],
    notes: 'Scanned from label. "The Perfect Snack Cracker," dill pickle flavor.',
  },
];

export const SEED_ITEMS: InventoryItem[] = SPECS.map((s) => ({
  id: s.id,
  household_id: 'h-marc-anna',
  normalized_name: s.normalized_name,
  display_name: s.display_name,
  category: s.category,
  unit: s.unit,
  location: s.location,
  brand: s.brand ?? null,
  package_size: s.package_size ?? null,
  purchase_date: isoDate(s.purchasedDaysAgo),
  opened_date: s.openedDaysAgo !== undefined ? isoDate(s.openedDaysAgo) : null,
  source: 'manual',
  confidence_score: 1,
  notes: s.notes ?? null,
  liked: s.liked ?? false,
  tags: s.tags ?? null,
  created_at: isoTime(s.purchasedDaysAgo),
  updated_at: isoTime(s.purchasedDaysAgo),
}));

export const SEED_EVENTS: InventoryEvent[] = SPECS.map((s, idx) => ({
  id: `e-${s.id}`,
  item_id: s.id,
  household_id: 'h-marc-anna',
  event_type: 'added',
  quantity_change: s.qty,
  reason: 'seed',
  source: 'manual',
  actor: idx % 2 === 0 ? 'marc' : 'anna',
  created_at: isoTime(s.purchasedDaysAgo),
}));
