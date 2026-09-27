"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

export function CommandPalette({
  query,
  results,
  onQueryChange,
  onClose,
}: {
  query: string;
  results: Array<{ type: string; label: string; sublabel: string; onClick: () => void }>;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="command-palette" role="dialog" aria-label="全局搜索">
        <input
          ref={inputRef}
          className="command-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索 CVE、组件或 PURL…"
        />
        <div className="command-results">
          {query && results.length ? (
            results.map((result) => (
              <button key={`${result.type}-${result.label}`} className="command-item" onClick={result.onClick}>
                <div>
                  <strong>{result.label}</strong>
                  <span>{result.sublabel}</span>
                </div>
                <span>{result.type}</span>
              </button>
            ))
          ) : (
            <div className="empty-state">
              <Search size={17} /> 输入关键词，搜索全局 CVE 与组件
            </div>
          )}
        </div>
      </div>
    </>
  );
}
