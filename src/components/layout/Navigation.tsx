"use client";

import type React from "react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavButtonProps {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
}

export const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick, collapsed = false }) => {
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
};
