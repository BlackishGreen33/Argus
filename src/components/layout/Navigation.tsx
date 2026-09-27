"use client";

import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function NavButton({
  active,
  icon,
  label,
  onClick,
  collapsed = false,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const button = (
    <button
      className={`nav-button ${active ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
}
