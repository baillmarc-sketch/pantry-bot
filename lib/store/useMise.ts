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
  today: string;
  setActor: typeof setActor;
  applyScan: typeof applyScan;
  consume: typeof consume;
  discard: typeof discard;
  toggleLike: typeof toggleLike;
  cookRecipe: (recipe: RankedRecipe) => { consumed: number };
  reset: typeof resetDemo;
}

export function useMise(recipeLimit = 5): MiseView {
  useEffect(() => {
    hydrate();
  }, []);

  const { items, events, actor } = useMiseState();
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

  const recipes = useMemo(
    () => rankRecipes(mockRecipes(), toPantryEntries(snapshot), { limit: recipeLimit }),
    [snapshot, recipeLimit],
  );

  return {
    actor,
    snapshot,
    likes,
    recipes,
    today,
    setActor,
    applyScan,
    consume,
    discard,
    toggleLike,
    cookRecipe: (recipe) => cook(recipe, snapshot),
    reset: resetDemo,
  };
}
