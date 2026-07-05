'use client';

import { useEffect, useMemo } from 'react';
import {
  hydrate,
  useMiseState,
  setActor,
  applyScan,
  consume,
  discard,
  cook,
  toggleLike,
  saveRecipe,
  removeRecipe,
  resetDemo,
} from './miseStore';
import { deriveInventory } from '../core/inventory';
import { spoilageStatus } from '../core/spoilage';
import { pantrySnapshot, toPantryEntries, type PantryItem } from '../core/snapshot';
import { rankRecipes, type RankedRecipe } from '../core/ranker';
import { mockRecipes } from '../ai/mock';

export interface MiseView {
  actor: ReturnType<typeof useMiseState>['actor'];
  snapshot: PantryItem[];
  likes: PantryItem[];
  recipes: RankedRecipe[];
  yourRecipes: RankedRecipe[];
  today: string;
  setActor: typeof setActor;
  applyScan: typeof applyScan;
  consume: typeof consume;
  discard: typeof discard;
  toggleLike: typeof toggleLike;
  saveRecipe: typeof saveRecipe;
  removeRecipe: typeof removeRecipe;
  cookRecipe: (recipe: RankedRecipe) => { consumed: number };
  reset: typeof resetDemo;
}

export function useMise(recipeLimit = 5): MiseView {
  useEffect(() => {
    hydrate();
  }, []);

  const { items, events, actor, savedRecipes } = useMiseState();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const snapshot = useMemo(
    () => pantrySnapshot(items, events, today),
    [items, events, today],
  );

  // Likes span the whole catalog (a product you like even when you're out of it),
  // so derive from ALL items, not just what's present.
  const likes = useMemo(
    () =>
      deriveInventory(items, events)
        .filter((d) => d.liked)
        .map((d) => ({ ...d, spoilage: spoilageStatus(d, today) })),
    [items, events, today],
  );

  const entries = useMemo(() => toPantryEntries(snapshot), [snapshot]);

  const recipes = useMemo(
    () => rankRecipes(mockRecipes(), entries, { limit: recipeLimit }),
    [entries, recipeLimit],
  );

  // Your saved recipes, ranked against the current pantry so each card knows
  // what you've got and what's still needed. Always shown (not top-N capped).
  const yourRecipes = useMemo(
    () => rankRecipes(savedRecipes, entries),
    [savedRecipes, entries],
  );

  return {
    actor,
    snapshot,
    likes,
    recipes,
    yourRecipes,
    today,
    setActor,
    applyScan,
    consume,
    discard,
    toggleLike,
    saveRecipe,
    removeRecipe,
    cookRecipe: (recipe) => cook(recipe, snapshot),
    reset: resetDemo,
  };
}
