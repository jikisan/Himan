import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** How far below the top of the page a letter's heading counts as "reached" (clears the sticky row). */
const REACHED_AT = 96;

/**
 * The sticky row of letter links. A pill slides to the letter the page is currently at as it scrolls, and a click
 * scrolls to that letter's group.
 */
export const LetterIndex = ({ letters }: { letters: string[] }) => {
  const row = useRef<HTMLElement>(null);
  const [active, setActive] = useState(letters[0]);
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const key = letters.join("");

  useEffect(() => {
    const update = () => {
      const heading = (letter: string) => document.getElementById(`apps-${letter}`)?.getBoundingClientRect().top ?? Infinity;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      // Past the last heading you can scroll to, the end of the page counts as the last letter.
      const reached = atBottom ? letters.at(-1) : letters.filter((l) => heading(l) <= REACHED_AT).at(-1);
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
    const link = row.current?.querySelector<HTMLElement>(`[data-letter="${active}"]`);
    if (link) setPill({ x: link.offsetLeft, y: link.offsetTop, w: link.offsetWidth, h: link.offsetHeight });
  }, [active, key]);

  return (
    <nav
      ref={row}
      aria-label="Jump to letter"
      className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap justify-center gap-1 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      {pill && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-primary shadow-sm transition-[transform,width,height] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: pill.w, height: pill.h, transform: `translate(${pill.x}px, ${pill.y}px)` }}
        />
      )}
      {letters.map((letter) => (
        <a
          key={letter}
          data-letter={letter}
          href={`#apps-${letter}`}
          aria-label={`Jump to ${letter}`}
          aria-current={letter === active ? "true" : undefined}
          onClick={(e) => { e.preventDefault(); document.getElementById(`apps-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          className={`relative flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            letter === active ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
          }`}
        >
          {letter}
        </a>
      ))}
    </nav>
  );
};
