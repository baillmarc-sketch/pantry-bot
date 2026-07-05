// Saved (user-authored) recipes seed. These live on the Cook screen alongside
// generated suggestions. First one is the porcini sugo we built together.

import type { RecipeInput } from '../core/types';

export const SAVED_RECIPES_SEED: RecipeInput[] = [
  {
    id: 'saved-porcini-sugo',
    title: 'Porcini Umami Sugo with Chicken Meatballs',
    servings: 2,
    time_estimate: 20,
    leftover_score: 0.6,
    saved: true,
    tags: ['asian', 'italian', 'umami', 'weeknight', 'pasta'],
    finishing_move: 'chili crisp + scallion',
    notes:
      'Soy/sesame/MSG over crushed tomatoes, dried porcini for depth + body, butter mounted off heat. Raw meatballs poach in the sauce. Cook meatballs to 165°F. Thick-ish: reduce uncovered, bloom tomato paste, cornstarch slurry as insurance.',
    ingredients: [
      { name: 'crushed tomatoes' },
      { name: 'dried porcini' },
      { name: 'chicken meatballs' },
      { name: 'onion' },
      { name: 'soy sauce', assumed_staple: true },
      { name: 'sesame oil', assumed_staple: true },
      { name: 'butter', assumed_staple: true },
      { name: 'garlic', assumed_staple: true },
      { name: 'rice vinegar', assumed_staple: true },
      { name: 'msg', assumed_staple: true },
    ],
  },
];
