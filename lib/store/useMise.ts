'use client';

import { useEffect, useMemo } from 'react';
import {
  hydrate,
  useMiseState,
  setActor,
  applyScan,
  addBottle,
  consume,
  discard,
  cook,
  toggleLike,
  setBestBy,
  saveRecipe,
  removeRecipe,
  resetDemo,
} from './miseStore';
import { deriveInventory, presentItems, type DerivedItem } from '../core/inventory';
import { spoilageStatus } from '../core/spoilage';
import { pantrySnapshot, toPantryEntries, type PantryItem } from '../core/snapshot';
import { rankRecipes, type RankedRecipe } from '../core/ranker';
import { rankCocktails, type RankedCocktail } from '../core/bar';
import { mockRecipes } from '../ai/mock';

export interface MiseView {
  actor: ReturnType<typeof useMiseState>['actor'];
  snapshot: PantryItem[];
  likes: PantryItem[];
  recipes: RankedRecipe[];
  yourRecipes: RankedRecipe[];
  barBottles: DerivedItem[];
  cocktails: RankedCocktail[];
  today: string;
  setActor: typeof setActor;
  applyScan: typeof applyScan;
  addBottle: typeof addBottle;
  consume: typeof consume;
  discard: typeof discard;
  toggleLike: typeof toggleLike;
  setBestBy: typeof setBestBy;
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

  const present = useMemo(
    () => presentItems(deriveInventory(items, events)),
    [items, events],
  );

  // Kitchen only — the bar lives on its own screen.
  const snapshot = useMemo(
    () => pantrySnapshot(items, events, today).filter((s) => s.location !== 'bar'),
    [items, events, today],
  );

  const barBottles = useMemo(() => present.filter((d) => d.location === 'bar'), [present]);

  // Everything on hand (bar bottles + kitchen citrus, etc.) for "shakeable now".
  const onHand = useMemo(() => new Set(present.map((d) => d.normalized_name)), [present]);

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

  // Food-only saved recipes on the Cook screen; cocktails route to the Bar.
  const yourRecipes = useMemo(
    () => rankRecipes(savedRecipes.filter((r) => r.kind !== 'cocktail'), entries),
    [savedRecipes, entries],
  );

  const cocktails = useMemo(
    () => rankCocktails(savedRecipes.filter((r) => r.kind === 'cocktail'), onHand),
    [savedRecipes, onHand],
  );

  return {
    actor,
    snapshot,
    likes,
    recipes,
    yourRecipes,
    barBottles,
    cocktails,
    today,
    setActor,
    applyScan,
    addBottle,
    consume,
    discard,
    toggleLike,
    setBestBy,
    saveRecipe,
    removeRecipe,
    cookRecipe: (recipe) => cook(recipe, snapshot),
    reset: resetDemo,
  };
}
