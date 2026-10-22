import { useSyncExternalStore } from 'react';

export { monthRows, monthTodo, paidChangeWarning, unreplacedCancelled } from '@himan/shared/rentals';
export type { MonthRow } from '@himan/shared/rentals';

const wideQuery = '(min-width: 1024px)';
/** True on laptop-size screens. Without matchMedia (tests, old browsers) it assumes a wide screen. */
export function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const query = window.matchMedia(wideQuery);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => typeof window.matchMedia !== 'function' || window.matchMedia(wideQuery).matches,
  );
}

export { METHOD_LABEL as METHOD, billName } from '@himan/shared/rentals';
