import { describe, it, expect } from 'vitest';
import { renderLetterHtml } from '@himan/shared/career';

describe('renderLetterHtml', () => {
  it('escapes interpolated HTML in the title', () => {
    const html = renderLetterHtml({
      bodyText: 'Dear Hiring Team,',
      documentTitle: 'Engineer at <script>alert(1)</script> & Co',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co');
  });

  it('escapes interpolated HTML in the body and splits paragraphs on blank lines', () => {
    const html = renderLetterHtml({
      bodyText: 'First <b>paragraph</b>.\n\nSecond paragraph.',
      documentTitle: 'Letter',
    });
    expect(html).toContain('<p>First &lt;b&gt;paragraph&lt;/b&gt;.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });

  it('includes exactly one interactive element: the print button', () => {
    const html = renderLetterHtml({ bodyText: 'Body.', documentTitle: 'Letter' });
    const buttonMatches = html.match(/<button/g) ?? [];
    expect(buttonMatches).toHaveLength(1);
    expect(html).toContain('onclick="window.print()"');
  });
});
