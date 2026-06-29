'use client';

import { useState, type ReactNode } from 'react';

type CollapsibleDropdownProps = {
  icon: ReactNode;
  label: string;
  preview?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleDropdown({
  icon,
  label,
  preview,
  defaultOpen = false,
  children,
}: CollapsibleDropdownProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border transition-colors duration-200 ${
        open
          ? 'border-purple-500/30 bg-purple-500/5'
          : 'border-purple-500/20 bg-purple-500/[0.03] hover:border-purple-500/30 hover:bg-purple-500/5'
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-400">
            {label}
          </span>
          {preview && !open && (
            <span className="text-[11px] font-normal normal-case tracking-normal text-muted">
              · {preview}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-muted transition-transform duration-250 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3.5 pb-3.5">{children}</div>
      </div>
    </div>
  );
}
