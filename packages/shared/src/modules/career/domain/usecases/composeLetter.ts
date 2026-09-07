import type { ComposableBlock, PlaceholderCtx, CareerLength, ResolveResult } from '../types/index.js';
import { resolvePlaceholders } from './resolvePlaceholders.js';

// Orders by position, drops blocks whose length doesn't match the requested
// variant (null length means "always include"), resolves placeholders per
// block, and joins with blank lines.
export function composeLetter(
  blocks: ComposableBlock[],
  ctx: PlaceholderCtx,
  length: CareerLength
): ResolveResult {
  const ordered = [...blocks].sort((a, b) => a.position - b.position);
  const included = ordered.filter((block) => block.length === null || block.length === length);

  const missing = new Set<string>();
  const paragraphs = included.map((block) => {
    const resolved = resolvePlaceholders(block.body, ctx);
    resolved.missing.forEach((token) => missing.add(token));
    return resolved.text;
  });

  return { text: paragraphs.join('\n\n'), missing: [...missing] };
}
