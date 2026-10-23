import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** Eases from the previous value to `target`; jumps straight there when the user prefers reduced motion. */
export function useCountUp(target: number, seconds = 0.9): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, target, {
      duration: seconds, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { from.current = v; setValue(v); },
    });
    return () => controls.stop();
  }, [target, seconds, reduce]);
  return reduce ? target : value;
}
