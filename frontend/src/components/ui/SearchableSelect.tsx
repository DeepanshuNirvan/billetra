import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  required?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  className,
  disabled,
  emptyLabel,
  required,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={clsx('flex flex-col gap-1', className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={clsx(
            'w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white text-left transition-colors',
            disabled
              ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200'
              : 'cursor-pointer hover:border-gray-400 border-gray-300',
            open && !disabled && 'border-primary-500 ring-2 ring-primary-200'
          )}
        >
          <span className={clsx('flex-1 truncate', !selected && 'text-gray-400')}>
            {selected ? (
              <span>
                {selected.label}
                {selected.sublabel && (
                  <span className="text-gray-400 ml-1 text-xs">{selected.sublabel}</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange('');
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown
              className={clsx(
                'h-4 w-4 text-gray-400 transition-transform duration-150',
                open && 'rotate-180'
              )}
            />
          </div>
        </button>

        {open && (
          <div className="absolute z-[100] mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                    if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].value);
                  }}
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {emptyLabel !== undefined && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    !value
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {emptyLabel || 'None'}
                </button>
              )}
              {filtered.length === 0 ? (
                <div className="px-3 py-5 text-sm text-gray-400 text-center">No results</div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      o.value === value
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-800'
                    )}
                  >
                    <div>{o.label}</div>
                    {o.sublabel && (
                      <div className="text-xs text-gray-400 mt-0.5">{o.sublabel}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
