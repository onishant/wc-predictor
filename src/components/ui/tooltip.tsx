'use client';

import { useState, useRef, type ReactNode } from 'react';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'bottom';
};

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function show() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  }

  function hide() {
    timeoutRef.current = setTimeout(() => setVisible(false), 100);
  }

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 w-64 rounded-xl border border-border-subtle bg-surface-overlay px-3 py-2.5 text-xs leading-relaxed text-body shadow-xl shadow-slate-950/60 ${
            side === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
        >
          {content}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              side === 'top'
                ? 'top-full border-t-border-subtle'
                : 'bottom-full border-b-border-subtle'
            }`}
          />
        </span>
      )}
    </span>
  );
}
