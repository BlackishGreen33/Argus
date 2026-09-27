"use client";

import { FileSearch, PackageSearch } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette({
  open,
  query,
  results,
  onQueryChange,
  onClose,
}: {
  open: boolean;
  query: string;
  results: Array<{ type: string; label: string; sublabel: string; onClick: () => void }>;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="全局搜索"
      description="搜索 CVE、组件或 PURL"
      className="command-dialog"
    >
      <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={onQueryChange} placeholder="搜索 CVE、组件或 PURL…" />
        <CommandList>
          {!query && <CommandEmpty>输入关键词，搜索全局 CVE 与组件</CommandEmpty>}
          {query && !results.length && <CommandEmpty>没有匹配的全局结果</CommandEmpty>}
          {results.length > 0 && (
            <CommandGroup heading="全局结果">
              {results.map((result) => (
                <CommandItem key={`${result.type}-${result.label}`} value={result.label} onSelect={result.onClick}>
                  {result.type === "CVE" ? <FileSearch /> : <PackageSearch />}
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">{result.label}</strong>
                    <span className="text-muted-foreground block truncate text-xs">{result.sublabel}</span>
                  </span>
                  <CommandShortcut>{result.type}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
