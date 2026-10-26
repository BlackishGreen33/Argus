"use client";

// Magic UI source; license retained in THIRD_PARTY_NOTICES.md.

import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type ComponentPropsWithoutRef, useEffect, useMemo, useRef } from "react";

import { cn } from "@/utils/cn";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  locale: string;
}

export function NumberTicker({
  value,
  startValue = value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  locale,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }),
    [locale, decimalPlaces],
  );
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 35,
    stiffness: 250,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (reduced) {
      springValue.jump(value);
      if (ref.current) ref.current.textContent = formatter.format(value);
    } else if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
      }, delay * 1000);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [motionValue, springValue, reduced, isInView, delay, value, direction, startValue, formatter]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = formatter.format(Number(latest.toFixed(decimalPlaces)));
        }
      }),
    [springValue, decimalPlaces, formatter],
  );

  return (
    <span data-slot="number-ticker" className={cn("inline-block tabular-nums", className)} {...props}>
      <span className="sr-only">{formatter.format(value)}</span>
      <span ref={ref} aria-hidden="true">
        {formatter.format(direction === "down" ? value : startValue)}
      </span>
    </span>
  );
}
