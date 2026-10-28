import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** A letter's heading counts as "reached" once it is above this fraction of the window height. */
const REACHED_AT = 0.4;

/** The element the page actually scrolls in: the nearest scrollable ancestor (the app shell), else the document. */
const scroller = (from: HTMLElement | null): Element => {
  for (let el = from?.parentElement; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return document.scrollingElement ?? document.documentElement;
};

/**
 * The vertical letter bar on the right edge, like the phone's. A blob slides to the letter the page is currently at as it
 * scrolls, and a click scrolls to that letter's group.
 */
export const LetterIndex = ({ letters }: { letters: string[] }) => {
  const row = useRef<HTMLElement>(null);
  const [active, setActive] = useState(letters[0]);
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  const key = letters.join("");

  useEffect(() => {
    const update = () => {
      const heading = (letter: string) => document.getElementById(`apps-${letter}`)?.getBoundingClientRect().top ?? Infinity;
      const box = scroller(row.current);
      // A page too short to scroll never "reaches" the bottom; otherwise the end of the page counts as the last letter.
      const atBottom = box.scrollTop > 0 && box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
      const reached = atBottom ? letters.at(-1) : letters.filter((l) => heading(l) <= window.innerHeight * REACHED_AT).at(-1);
      setActive(reached ?? letters[0]);
    };
    update();
    // The page scrolls inside the app shell, so listen in the capture phase to hear whichever element scrolls.
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => { document.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the letters' contents
  }, [key]);

  useLayoutEffect(() => {
    const place = () => {
      const link = row.current?.querySelector<HTMLElement>(`[data-letter="${active}"]`);
      if (link) setPill({ y: link.offsetTop, h: link.offsetHeight });
    };
    place();
    // The bar is 60% of the window tall, so its rows change size with it.
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, key]);

  return (
    <nav
      ref={row}
      aria-label="Jump to letter"
      className="sticky top-[20vh] z-10 flex h-[60vh] max-h-[34rem] w-10 flex-col rounded-full border border-border/60 bg-background/80 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      {pill && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
          style={{ height: pill.h, transform: `translateY(${pill.y}px)` }}
        >
          <span className="h-8 w-8 rounded-full bg-primary shadow-sm" />
        </span>
      )}
      {letters.map((letter) => (
        <a
          key={letter}
          data-letter={letter}
          href={`#apps-${letter}`}
          aria-label={`Jump to ${letter}`}
          aria-current={letter === active ? "true" : undefined}
          onClick={(e) => { e.preventDefault(); document.getElementById(`apps-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          className={`relative flex min-h-0 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-[color,transform] duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            letter === active ? "scale-125 text-primary-foreground" : "text-muted-foreground hover:text-primary"
          }`}
        >
          {letter}
        </a>
      ))}
    </nav>
  );
};
