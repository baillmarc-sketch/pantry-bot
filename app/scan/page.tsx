'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../ui';
import { MockAIProvider } from '../../lib/ai/mock';
import { setPendingScan } from '../../lib/store/miseStore';

const SAMPLE = `ORG CUKES 3CT
BNLS CHX THIGH 2.1LB
ATLANTIC SALMON 0.9LB
LG EGGS DOZEN
SWT POTATO 2EA`;

export default function ScanPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function scan(input: string) {
    setBusy(true);
    try {
      const ai = new MockAIProvider();
      const { items } = await ai.parseReceipt(input.trim() ? { text: input } : {});
      setPendingScan(items);
      router.push('/scan/confirm');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header
        kicker="Mise · Scan"
        title="Add to the pantry"
        sub="Paste a receipt, or try a sample. Nothing’s added until you confirm."
      />
      <div className="screen">
        <div className="card">
          <label htmlFor="receipt">Receipt text</label>
          <textarea
            id="receipt"
            placeholder={'Paste receipt lines, e.g.\n' + SAMPLE}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row-actions">
            <button
              className="btn btn-primary btn-block"
              disabled={busy || !text.trim()}
              onClick={() => scan(text)}
            >
              Scan pasted text
            </button>
          </div>
          <div className="row-actions">
            <button
              className="btn btn-ghost btn-block"
              disabled={busy}
              onClick={() => {
                setText(SAMPLE);
                scan(SAMPLE);
              }}
            >
              Use a sample receipt
            </button>
          </div>
        </div>

        <div className="callout">
          Known items resolve through a local dictionary at <b>$0</b> — no model needed. (Real
          camera + AI scanning lands when we wire the API.)
        </div>
      </div>
    </>
  );
}
