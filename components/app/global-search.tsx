"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: string;
  code: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = (await response.json()) as { results?: SearchResult[] };
          setResults(data.results ?? []);
          setOpen(true);
        }
      } catch {
        // Aborted or offline; leave the previous results.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
    } else {
      setLoading(true);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search prospects, codes, models…"
          className="h-9 w-full rounded-lg border border-input bg-secondary/50 pr-8 pl-8 text-[12px] text-foreground focus-visible:border-ring focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none"
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.length ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    href={result.href}
                    onClick={() => {
                      setOpen(false);
                      updateQuery("");
                    }}
                    className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium">
                        {result.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 rounded border border-border px-1 py-0.5 text-[9px] tracking-wide uppercase",
                        "text-muted-foreground",
                      )}
                    >
                      {result.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-[12px] text-muted-foreground">
              No matches. Try a name, code, or model.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
