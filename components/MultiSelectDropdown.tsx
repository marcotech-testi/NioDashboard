"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/useClickOutside";

type MultiSelectDropdownProps = {
  label: string;
  options: string[];
  /** null significa "todos selecionados" (nenhum filtro aplicado). */
  selected: Set<string> | null;
  onChange: (next: Set<string> | null) => void;
};

export function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const allSelected = selected === null;
  const count = allSelected ? options.length : selected.size;

  function toggle(option: string) {
    const base = new Set(selected ?? options);
    if (base.has(option)) {
      base.delete(option);
    } else {
      base.add(option);
    }
    onChange(base.size === options.length ? null : base);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="card px-3 py-2 text-sm text-text hover:border-brand-blue/60 transition-colors min-w-40 text-left flex items-center justify-between gap-2"
      >
        <span className="text-text-muted">{label}</span>
        <span className="font-medium">
          {allSelected ? "Todos" : `${count} selecionado${count === 1 ? "" : "s"}`}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-64 max-h-72 overflow-auto card p-2 shadow-xl">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="w-full text-left px-2 py-1.5 text-xs text-brand-blue hover:bg-surface-hover rounded"
          >
            Selecionar todos
          </button>
          {options.length === 0 && (
            <p className="text-xs text-text-muted px-2 py-1.5">Nenhuma opção disponível.</p>
          )}
          {options.map((option) => {
            const checked = allSelected || selected.has(option);
            return (
              <label
                key={option}
                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-surface-hover rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option)}
                  className="accent-brand-pink"
                />
                <span className="truncate">{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
