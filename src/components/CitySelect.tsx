import { useState, useRef, useEffect } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';

interface CitySelectProps {
  label: string;
  icon?: 'from' | 'to';
  value: string;
  onChange: (value: string) => void;
  cities: string[];
  placeholder?: string;
}

export function CitySelect({
  label,
  icon = 'from',
  value,
  onChange,
  cities,
  placeholder = 'Any city',
}: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounce the parent onChange so it only fires after typing pauses
  function commitValue(v: string, delay = 600) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), delay);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // Commit whatever the user typed, even if it's not in the list
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim()) {
          onChange(query.trim());
        } else {
          onChange('');
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, onChange]);

  const filtered = cities.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  const showDropdown = open && filtered.length > 0;

  // Show a "use typed value" hint when the query doesn't match any city
  const hasExactMatch = filtered.some(
    (c) => c.toLowerCase() === query.toLowerCase(),
  );
  const showCustomHint = open && query.trim().length > 0 && !hasExactMatch;

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-500 dark:text-sand-400">
        <MapPin className="h-3.5 w-3.5" /> {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value.trim() === '') {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              onChange('');
            } else {
              commitValue(e.target.value.trim());
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              const match = filtered.find(
                (c) => c.toLowerCase() === query.toLowerCase(),
              );
              if (match) {
                onChange(match);
                setQuery(match);
              } else if (filtered.length > 0 && query.toLowerCase() !== filtered[0].toLowerCase()) {
                onChange(filtered[0]);
                setQuery(filtered[0]);
              } else {
                // Accept the typed text as-is even if not in the list
                onChange(query.trim());
              }
              setOpen(false);
            }
            if (e.key === 'Escape') {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setOpen(false);
              setQuery(value);
            }
          }}
          placeholder={placeholder}
          className="input-field pr-8"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && (
            <button
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange('');
                setQuery('');
              }}
              className="text-ink-400 hover:text-ink-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-ink-400" />
        </div>
      </div>
      {(showDropdown || showCustomHint) && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-sand-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
          {showCustomHint && (
            <button
              type="button"
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange(query.trim());
                setQuery(query.trim());
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-sand-100 px-3 py-2 text-left text-sm text-terracotta-700 transition-colors hover:bg-terracotta-50 dark:border-ink-700 dark:text-terracotta-400 dark:hover:bg-terracotta-900/30"
            >
              <MapPin className="h-3.5 w-3.5" />
              Use &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange(c);
                setQuery(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-sand-50 dark:hover:bg-ink-800 ${
                c === value
                  ? 'bg-terracotta-50 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400'
                  : 'text-ink-700 dark:text-sand-200'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-ink-400" />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
