"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/formatting";

/** تخفيف حركة الأرقام حتى تبدو المحاكاة حيّة لا قافزة */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useAnimatedValue(target: number, duration = 550) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const next = from + (target - from) * easeOut(progress);
      setValue(next);
      fromRef.current = next;
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

export function AnimatedNumber({
  value,
  fractionDigits = 0,
  className,
}: {
  value: number;
  fractionDigits?: number;
  className?: string;
}) {
  const animated = useAnimatedValue(value);
  return (
    <span className={className} suppressHydrationWarning>
      {formatNumber(animated, fractionDigits)}
    </span>
  );
}
