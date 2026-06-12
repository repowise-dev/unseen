import React from 'react';
import { useOverlayStore } from '../store';
import { useStickyScroll } from './useStickyScroll';

export function Transcript(): React.JSX.Element {
  const turns = useOverlayStore((s) => s.turns);
  const interim = useOverlayStore((s) => s.interim);
  const ref = useStickyScroll<HTMLDivElement>([turns, interim]);

  return (
    <div id="transcript" ref={ref}>
      {turns.length === 0 && !interim ? (
        <span className="placeholder">Waiting for audio…</span>
      ) : (
        <>
          {turns.map((t, i) => (
            <div key={i}>
              [S{t.speaker}] {t.text}
            </div>
          ))}
          {interim && <span className="interim">{interim}</span>}
        </>
      )}
    </div>
  );
}
