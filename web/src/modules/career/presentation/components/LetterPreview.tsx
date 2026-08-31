import { composeLetter, type CareerLength, type ComposableBlock, type PlaceholderCtx } from '@himan/shared/career';

interface LetterPreviewProps {
  blocks: ComposableBlock[];
  ctx: PlaceholderCtx;
  length: CareerLength;
}

export const LetterPreview = ({ blocks, ctx, length }: LetterPreviewProps) => {
  const { text, missing } = composeLetter(blocks, ctx, length);

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      {missing.length > 0 && (
        <p className="text-xs text-destructive mb-3">
          Unresolved placeholders: {missing.join(', ')}
        </p>
      )}
      {text.trim() ? (
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{text}</div>
      ) : (
        <p className="text-sm text-muted-foreground">Select blocks to preview the letter.</p>
      )}
    </div>
  );
};
