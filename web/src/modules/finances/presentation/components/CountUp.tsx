import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { formatPesos } from '@himan/shared/finances';

/** Counts up to `centavos` when it changes; the final amount is always available to screen readers. */
export function CountUp({ centavos }: { centavos: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, centavos, {
      duration: 0.7, ease: 'easeOut',
      onUpdate: (v) => { from.current = v; setShown(Math.round(v)); },
    });
    return () => controls.stop();
  }, [centavos, reduce]);
  return <>
    <span aria-hidden="true" className="tabular-nums">{formatPesos(reduce ? centavos : shown)}</span>
    <span className="sr-only">{formatPesos(centavos)}</span>
  </>;
}
