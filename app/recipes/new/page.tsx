'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../ui';
import { useMise } from '../../../lib/store/useMise';
import { parseRecipeForm, type RecipeFormInput } from '../../../lib/store/recipeForm';
import { defaultCtx } from '../../../lib/store/actions';

const BLANK: RecipeFormInput = {
  title: '',
  time_estimate: '',
  servings: '',
  ingredients: '',
  steps: '',
  tags: '',
  finishing_move: '',
  notes: '',
};

export default function NewRecipePage() {
  const router = useRouter();
  const { saveRecipe } = useMise();
  const [form, setForm] = useState<RecipeFormInput>(BLANK);
  const [errors, setErrors] = useState<string[]>([]);

  function set<K extends keyof RecipeFormInput>(key: K, value: RecipeFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const res = parseRecipeForm(form, defaultCtx.id());
    if (!res.ok || !res.recipe) {
      setErrors(res.errors);
      return;
    }
    saveRecipe(res.recipe);
    router.push('/');
  }

  return (
    <>
      <Header
        kicker="Mise · New recipe"
        title="Save a recipe"
        sub="It’ll live on your Cook screen, ranked against what you’ve got."
      />
      <div className="screen">
        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Porcini Umami Sugo"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="time">Time (min)</label>
              <input
                id="time"
                type="number"
                inputMode="numeric"
                value={form.time_estimate}
                onChange={(e) => set('time_estimate', e.target.value)}
                placeholder="20"
              />
            </div>
            <div>
              <label htmlFor="servings">Serves</label>
              <input
                id="servings"
                type="number"
                inputMode="numeric"
                value={form.servings}
                onChange={(e) => set('servings', e.target.value)}
                placeholder="2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ingredients">Ingredients — one per line</label>
            <textarea
              id="ingredients"
              value={form.ingredients}
              onChange={(e) => set('ingredients', e.target.value)}
              placeholder={'crushed tomatoes\ndried porcini\nchicken meatballs\nonion'}
            />
          </div>

          <div>
            <label htmlFor="steps">Method — one step per line</label>
            <textarea
              id="steps"
              value={form.steps}
              onChange={(e) => set('steps', e.target.value)}
              placeholder={'Sear the meatballs\nBuild the sauce\nSimmer 20 min'}
            />
          </div>

          <div>
            <label>Effort</label>
            <div className="seg" role="group" aria-label="Effort" style={{ marginTop: 6 }}>
              {([['Auto', undefined], ['Easy', 'easy'], ['Involved', 'involved']] as const).map(
                ([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    className={form.effort === val ? 'on' : ''}
                    onClick={() => set('effort', val)}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label htmlFor="finish">Finishing move</label>
            <input
              id="finish"
              type="text"
              value={form.finishing_move}
              onChange={(e) => set('finishing_move', e.target.value)}
              placeholder="chili crisp + scallion"
            />
          </div>

          <div>
            <label htmlFor="tags">Tags — comma separated</label>
            <input
              id="tags"
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="asian, pasta, weeknight"
            />
          </div>

          <div>
            <label htmlFor="notes">Notes / method</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any method notes, doneness temps, swaps…"
            />
          </div>

          {errors.length > 0 && (
            <div className="callout" role="alert">
              {errors.map((e) => (
                <div key={e}>⚠️ {e}</div>
              ))}
            </div>
          )}

          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={submit}>
              Save to Cook screen
            </button>
          </div>
          <div className="row-actions">
            <button className="btn btn-ghost btn-block" onClick={() => router.push('/')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
