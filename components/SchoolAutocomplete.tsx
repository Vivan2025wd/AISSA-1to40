"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface School {
  id: number;
  name: string;
  district: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function SchoolAutocomplete({
  value,
  onChange,
  placeholder = "ඔබේ පාසලේ නම ලියන්න...",
  required,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local input in sync if parent resets value
  useEffect(() => { setQuery(value); }, [value]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) { setResults([]); return; }

    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("schools")
        .select("id, name, district")
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(8);
      setResults(data ?? []);
      setHighlight(0);
      setLoading(false);
    }, 200);

    return () => clearTimeout(t);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectSchool(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (results[highlight]) {
        e.preventDefault();
        selectSchool(results[highlight].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showAddRow =
    query.trim().length >= 2 &&
    !loading &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          className="input pl-9"
          value={query}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-500">සොයමින්...</div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-auto py-1">
              {results.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSchool(s.name)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                      i === highlight ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-900">{s.name}</span>
                    </span>
                    {s.district && (
                      <span className="text-xs text-slate-500">{s.district}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showAddRow && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSchool(query.trim())}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
            >
              <Plus className="h-3.5 w-3.5" />
              &ldquo;{query.trim()}&rdquo; ලෙස එක් කරන්න
            </button>
          )}

          {!loading && results.length === 0 && !showAddRow && (
            <div className="px-3 py-2 text-xs text-slate-500">
              පාසලක් හමු නොවීය.
            </div>
          )}
        </div>
      )}
    </div>
  );
}