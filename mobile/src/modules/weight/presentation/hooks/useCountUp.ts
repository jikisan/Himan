import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/** Eases from the previous value to `target`; jumps straight there when the user prefers reduced motion. */
export function useCountUp(target: number, ms = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) return;
    const start = from.current; const t0 = Date.now(); let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      from.current = start + (target - start) * (1 - Math.pow(1 - p, 3));
      setValue(from.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return reduce ? target : value;
}
