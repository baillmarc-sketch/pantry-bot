'use client';

import { useMise } from '../lib/store/useMise';

export function Toolbar() {
  const { actor, setActor, reset } = useMise();
  return (
    <div className="toolbar">
      <span>
        Cooking as{' '}
        <span className="seg" role="group" aria-label="Who's cooking">
          <button
            className={actor === 'marc' ? 'on' : ''}
            onClick={() => setActor('marc')}
            aria-pressed={actor === 'marc'}
          >
            Marc
          </button>
          <button
            className={actor === 'anna' ? 'on' : ''}
            onClick={() => setActor('anna')}
            aria-pressed={actor === 'anna'}
          >
            Anna
          </button>
        </span>
      </span>
      <button
        className="link-btn"
        onClick={() => {
          if (confirm('Reset Mise to the demo pantry? This clears your changes on this device.'))
            reset();
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
