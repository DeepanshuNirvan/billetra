import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
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

interface Coords {
  left: number;
  top: number;
  width: number;
  openUp: boolean;
}

const PANEL_MAX_H = 280;

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
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Position the portal panel relative to the trigger (fixed coords so it is
  // never clipped by overflow:auto/hidden ancestors such as table wrappers).
  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    if (window.innerWidth < 640) {
      setIsMobile(true);
      return;
    }
    setIsMobile(false);
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < PANEL_MAX_H && r.top > spaceBelow;
    setCoords({
      left: r.left,
      top: openUp ? r.top : r.bottom,
      width: r.width,
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    setQuery('');
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, reposition]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={clsx(
          'w-full min-w-[150px] flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white text-left transition-colors',
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200'
            : 'cursor-pointer hover:border-gray-400 border-gray-300',
          open && !disabled && 'border-primary-500 ring-2 ring-primary-200'
        )}
      >
        <span className={clsx('flex-1 truncate', !selected && 'text-gray-400')}>
          {selected ? (
            <>
              {selected.label}
              {selected.sublabel && (
                <span className="text-gray-400 ml-1 text-xs">{selected.sublabel}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
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
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={clsx('h-4 w-4 text-gray-400 transition-transform duration-150', open && 'rotate-180')}
          />
        </span>
      </button>

      {open &&
        (coords || isMobile) &&
        createPortal(
          <>
            {isMobile && (
              <div
                className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm sm:hidden"
                onClick={() => setOpen(false)}
              />
            )}
          <div
            ref={panelRef}
            style={
              isMobile
                ? { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000 }
                : {
                    position: 'fixed',
                    left: coords!.left,
                    top: coords!.openUp ? undefined : coords!.top + 4,
                    bottom: coords!.openUp ? window.innerHeight - coords!.top + 4 : undefined,
                    width: Math.max(coords!.width, 220),
                    zIndex: 1000,
                  }
            }
            className={clsx(
              'bg-white border border-gray-200 shadow-2xl overflow-hidden',
              isMobile ? 'rounded-t-2xl sheet-up' : 'rounded-xl'
            )}
          >
            {isMobile && (
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1.5 w-10 rounded-full bg-gray-300" />
              </div>
            )}
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
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
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto py-1" style={{ maxHeight: isMobile ? '55vh' : PANEL_MAX_H - 56 }}>
              {emptyLabel !== undefined && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={clsx(
                    'w-full flex items-center justify-between text-left px-3 py-2.5 text-sm transition-colors',
                    !value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {emptyLabel || 'None'}
                  {!value && <Check className="h-4 w-4" />}
                </button>
              )}
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-sm text-gray-400 text-center">No results found</div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={clsx(
                      'w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-sm transition-colors',
                      o.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-800'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.sublabel && <span className="block text-xs text-gray-400 mt-0.5 truncate">{o.sublabel}</span>}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  );
}
