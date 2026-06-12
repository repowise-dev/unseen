import React, { useState } from 'react';
import { useOverlayStore } from '../store';
import { renderMarkdown } from '../markdown';
import { useStickyScroll, isAtBottom } from './useStickyScroll';

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="ghost-btn copy-btn"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? '✓' : 'copy'}
    </button>
  );
}

export function AnswerFeed(): React.JSX.Element {
  const answers = useOverlayStore((s) => s.answers);
  const ref = useStickyScroll<HTMLDivElement>([answers]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  return (
    <>
      <div
        id="answers"
        ref={ref}
        onScroll={(e) => setShowScrollBtn(!isAtBottom(e.currentTarget))}
      >
        {answers.map((a) => (
          <div className="answer-item" key={a.id}>
            <div className="meta">
              <span>{a.ts}</span>
              {a.text && <CopyButton text={a.text} />}
            </div>
            {a.error ? (
              <span className="err">error: {a.error}</span>
            ) : (
              <div
                className="body"
                // renderMarkdown escapes all model output before injecting.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(a.text) }}
              />
            )}
          </div>
        ))}
      </div>
      {showScrollBtn && (
        <button
          className="ghost-btn scroll-btn"
          onClick={() => {
            const el = ref.current;
            if (el) el.scrollTop = el.scrollHeight;
            setShowScrollBtn(false);
          }}
        >
          ↓
        </button>
      )}
    </>
  );
}
