// The household profile: nutrition targets + the eating philosophy, in one place.
// Read by the Balance rating engine now, and by the AI recipe generator later.
// This is preference, not a diet — encode intent, not restriction.

export const HOUSEHOLD_NUTRITION = {
  /** Per person. The app does NOT track calories today; this is context for
   *  ratings/portions and a hook for an opt-in tracker someday. */
  daily_calories_each: 2000,
  people: 2,

  /** What a good day looks like — aspirational, not enforced. */
  daily_goals: [
    'some fruit',
    'some vegetables',
    'a clean protein (fish, chicken, tofu, eggs, legumes)',
    'not too much added fat — but use it where it belongs',
  ],

  /** The stance. The rating must reflect this, or it will feel wrong. */
  philosophy: [
    'Cleaner and healthier, NOT a restrictive diet.',
    "Don't be afraid of butter where it needs butter, or sugar where it needs sugar.",
    'Treats are allowed — PB&J, tomato-bacon-Kewpie sandwiches — just call them what they are.',
    'Balance across the day matters more than any single dish.',
  ],
} as const;
