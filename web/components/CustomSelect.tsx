"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  secondaryLabel?: string;
  icon?: ReactNode;
  badge?: string;
  description?: string;
}

interface CustomSelectProps<T extends string | number> {
  id?: string;
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CustomSelect<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select an option",
  className = "",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all flex items-center justify-between gap-3 text-sm select-none ${
          disabled
            ? "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "border-[#22C55E] ring-4 ring-green-100 dark:ring-green-900/30 bg-white dark:bg-[#08261F] text-[#1F2937] dark:text-white shadow-sm"
            : "border-slate-200 dark:border-[#1E5645] bg-white dark:bg-[#08261F] text-[#1F2937] dark:text-gray-100 hover:border-slate-300 dark:hover:border-emerald-600/70"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center justify-center text-base">
              {selectedOption.icon}
            </span>
          )}
          <div className="min-w-0 flex-1 truncate">
            {selectedOption ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B3D2E] dark:text-white truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.secondaryLabel && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    ({selectedOption.secondaryLabel})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          {selectedOption?.badge && (
            <span className="hidden sm:inline-block shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/60 text-[#0B7A4B] dark:text-[#22C55E] border border-green-200 dark:border-green-800/60">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Chevron Icon */}
        <span
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#22C55E]" : ""
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white dark:bg-[#08261F] border border-slate-200 dark:border-[#164738] shadow-2xl p-1.5 max-h-72 overflow-y-auto no-scrollbar animate-fade-in"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={String(option.value)}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`group flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-[#0B3D2E] text-[#0B3D2E] dark:text-[#22C55E] font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0D382D]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {option.icon && (
                    <span className="shrink-0 text-lg flex items-center justify-center">
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {option.label}
                      </span>
                      {option.secondaryLabel && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          ({option.secondaryLabel})
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {option.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#071F17] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#164738]">
                      {option.badge}
                    </span>
                  )}
                  {isSelected ? (
                    <span className="text-sm font-black text-emerald-600 dark:text-[#22C55E] flex items-center justify-center w-5 h-5">
                      ✓
                    </span>
                  ) : (
                    <span className="w-5 h-5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
