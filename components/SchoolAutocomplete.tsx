"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Plus, School as SchoolIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SchoolAutocomplete({
  value,
  onChange,
  placeholder = "Start typing your school name…",
  required,
}: Props) {
  const query = value;
  const [results, setResults] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Debounced search */
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      const t = setTimeout(() => setResults([]), 200);
      return () => clearTimeout(t);
    }

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

  /* Close on outside click */
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

  const trimmed = query.trim();
  const showAddRow =
    trimmed.length >= 2 &&
    !loading &&
    !results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  const showDropdown = open && trimmed.length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      {/* ---------- Input ---------- */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5"
          value={query}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-500" />
        )}
      </div>

      {/* ---------- Dropdown ---------- */}
      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
          {/* Loading (only if no results yet) */}
          {loading && results.length === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
              Searching schools…
            </div>
          )}

          {/* Result list */}
          {results.length > 0 && (
            <ul className="max-h-56 overflow-y-auto py-1 sm:max-h-64">
              {results.map((s, i) => {
                const active = i === highlight;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSchool(s.name)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition active:bg-sky-100 sm:px-3 sm:py-2.5 ${
                        active ? "bg-sky-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition sm:h-7 sm:w-7 ${
                            active
                              ? "bg-linear-to-br from-sky-100 to-sky-50 text-sky-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <SchoolIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </span>
                        <span
                          className={`truncate text-sm ${
                            active
                              ? "font-semibold text-sky-900"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {s.name}
                        </span>
                      </span>

                      {s.district && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            active
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <MapPin className="h-2.5 w-2.5" />
                          {s.district}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add custom entry */}
          {showAddRow && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSchool(trimmed)}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 bg-slate-50/50 px-3.5 py-3 text-left text-sm font-medium text-sky-700 transition hover:bg-sky-50 active:scale-[0.99] active:bg-sky-100 sm:px-3 sm:py-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/25">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 truncate">
                Use &ldquo;<span className="font-semibold">{trimmed}</span>&rdquo;
              </span>
            </button>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && !showAddRow && (
            <div className="px-3 py-5 text-center text-xs text-slate-500">
              No schools match &ldquo;{trimmed}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}