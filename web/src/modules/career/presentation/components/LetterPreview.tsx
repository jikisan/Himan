import { composeLetter, type CareerLength, type ComposableBlock, type PlaceholderCtx } from '@himan/shared/career';
import { renderHighlightedLetterText } from '../utils/renderHighlightedLetterText';

interface LetterPreviewProps {
  blocks: ComposableBlock[];
  ctx: PlaceholderCtx;
  length: CareerLength;
}

export const LetterPreview = ({ blocks, ctx, length }: LetterPreviewProps) => {
  const { text } = composeLetter(blocks, ctx, length);

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      {text.trim() ? (
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderHighlightedLetterText(text)}</div>
      ) : (
        <p className="text-sm text-muted-foreground">Select blocks to preview the letter.</p>
      )}
    </div>
  );
};
