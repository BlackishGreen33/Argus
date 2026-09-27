"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type React from "react";
import type { ReactNode } from "react";

interface PageTransitionProps {
  page: string;
  children: ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ page, children }) => {
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={page}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
