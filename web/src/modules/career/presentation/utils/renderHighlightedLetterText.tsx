import { Fragment } from 'react';

// Unresolved tokens render inline as [[token]] (see resolvePlaceholders) — highlight
// them in place instead of duplicating the warning as a separate banner.
export const renderHighlightedLetterText = (text: string) =>
  text.split(/(\[\[\w+\]\])/g).map((part, i) =>
    /^\[\[\w+\]\]$/.test(part) ? (
      <span key={i} className="text-destructive font-medium">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
