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
  resetDemo,
} from './miseStore';
import { pantrySnapshot, toPantryEntries, type PantryItem } from '../core/snapshot';
import { rankRecipes, type RankedRecipe } from '../core/ranker';
import { mockRecipes } from '../ai/mock';

export interface MiseView {
  actor: ReturnType<typeof useMiseState>['actor'];
  snapshot: PantryItem[];
  recipes: RankedRecipe[];
  today: string;
  setActor: typeof setActor;
  applyScan: typeof applyScan;
  consume: typeof consume;
  discard: typeof discard;
  cookRecipe: (recipe: RankedRecipe) => { consumed: number };
  reset: typeof resetDemo;
}

export function useMise(recipeLimit = 5): MiseView {
  // Load real on-device data after mount (SSR/first paint uses the seed).
  useEffect(() => {
    hydrate();
  }, []);

  const { items, events, actor } = useMiseState();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const snapshot = useMemo(
    () => pantrySnapshot(items, events, today),
    [items, events, today],
  );

  const recipes = useMemo(
    () => rankRecipes(mockRecipes(), toPantryEntries(snapshot), { limit: recipeLimit }),
    [snapshot, recipeLimit],
  );

  return {
    actor,
    snapshot,
    recipes,
    today,
    setActor,
    applyScan,
    consume,
    discard,
    cookRecipe: (recipe) => cook(recipe, snapshot),
    reset: resetDemo,
  };
}
