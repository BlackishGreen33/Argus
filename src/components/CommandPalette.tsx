"use client";

import { FileSearch, PackageSearch } from "lucide-react";
import type React from "react";

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
import { useI18n } from "@/i18n";

interface CommandPaletteResult {
  type: string;
  label: string;
  sublabel: string;
  onClick: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  query: string;
  results: CommandPaletteResult[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, query, results, onQueryChange, onClose }) => {
  const { t } = useI18n();
  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t("search.command.title")}
      description={t("search.command.description")}
      className="command-dialog"
    >
      <Command shouldFilter={false}>
        <CommandInput
          name="global-command-search"
          autoComplete="off"
          aria-label={t("search.global.label")}
          value={query}
          onValueChange={onQueryChange}
          placeholder={t("search.global.placeholder")}
        />
        <CommandList>
          {!query && <CommandEmpty>{t("search.command.empty")}</CommandEmpty>}
          {query && !results.length && <CommandEmpty>{t("search.command.noResults")}</CommandEmpty>}
          {results.length > 0 && (
            <CommandGroup heading={t("search.command.group")}>
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
};
