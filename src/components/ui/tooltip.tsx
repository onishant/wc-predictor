'use client';

import { useState, useRef, type ReactNode } from 'react';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: 'right' | 'top' | 'bottom';
};

export function Tooltip({ children, content, side = 'right' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function show() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  }

  function hide() {
    timeoutRef.current = setTimeout(() => setVisible(false), 100);
  }

  const positionClasses = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };

  const arrowClasses = {
    right: 'right-full top-1/2 -translate-y-1/2 border-r-border-subtle',
    top: 'top-full left-1/2 -translate-x-1/2 border-t-border-subtle',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-border-subtle',
  };

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
          className={`absolute z-50 w-64 rounded-xl border border-border-subtle bg-surface-overlay px-3 py-2.5 text-xs leading-relaxed text-body shadow-xl shadow-slate-950/60 ${positionClasses[side]}`}
        >
          {content}
          <span
            className={`absolute border-4 border-transparent ${arrowClasses[side]}`}
          />
        </span>
      )}
    </span>
  );
}
