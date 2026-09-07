import { describe, it, expect } from 'vitest';
import { composeLetter, type ComposableBlock } from '@himan/shared/career';

const ctx = { jobTitle: 'Engineer', company: 'Acme' };

describe('composeLetter', () => {
  it('orders paragraphs by position regardless of input order', () => {
    const blocks: ComposableBlock[] = [
      { blockId: '2', position: 1, length: null, body: 'Second.' },
      { blockId: '1', position: 0, length: null, body: 'First.' },
    ];
    const { text } = composeLetter(blocks, ctx, 'long');
    expect(text).toBe('First.\n\nSecond.');
  });

  it('keeps blocks with null length in every variant', () => {
    const blocks: ComposableBlock[] = [{ blockId: '1', position: 0, length: null, body: 'Always here.' }];
    expect(composeLetter(blocks, ctx, 'short').text).toBe('Always here.');
    expect(composeLetter(blocks, ctx, 'long').text).toBe('Always here.');
  });

  it('drops blocks whose length does not match the requested variant', () => {
    const blocks: ComposableBlock[] = [
      { blockId: '1', position: 0, length: 'short', body: 'Short only.' },
      { blockId: '2', position: 1, length: 'long', body: 'Long only.' },
    ];
    expect(composeLetter(blocks, ctx, 'short').text).toBe('Short only.');
    expect(composeLetter(blocks, ctx, 'long').text).toBe('Long only.');
  });

  it('propagates missing placeholders across blocks', () => {
    const blocks: ComposableBlock[] = [
      { blockId: '1', position: 0, length: null, body: '{{job_title}}' },
      { blockId: '2', position: 1, length: null, body: '{{company}}' },
    ];
    const { missing } = composeLetter(blocks, { jobTitle: '', company: '' }, 'long');
    expect(missing).toEqual(['job_title', 'company']);
  });
});
