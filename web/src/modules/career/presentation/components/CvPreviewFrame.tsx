import { useEffect, useRef, useState } from 'react';

const A4_WIDTH_PX = 794; // A4 @96dpi — the width the PDF is rasterized at.
const A4_RATIO = 297 / 210;

// Renders the CV HTML at the fixed A4 width the PDF uses, then scales to fit
// the container. Rendering at the same width means the preview wraps line-for-
// line like the generated PDF — the preview shows exactly the output.
export const CvPreviewFrame = ({ html, title }: { html: string; title: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / A4_WIDTH_PX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden" style={{ aspectRatio: '210 / 297' }}>
      <iframe
        srcDoc={html}
        title={title}
        sandbox="allow-same-origin"
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_WIDTH_PX * A4_RATIO}px`,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
};
