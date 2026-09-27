import { describe, it, expect } from 'vitest';
import { resolvePlaceholders } from '@himan/shared/career';

describe('resolvePlaceholders', () => {
  it('resolves known tokens', () => {
    const { text, missing } = resolvePlaceholders(
      'I am applying for {{job_title}} at {{company}}.',
      { jobTitle: 'Engineer', company: 'Acme' }
    );
    expect(text).toBe('I am applying for Engineer at Acme.');
    expect(missing).toEqual([]);
  });

  it('renders an unresolved token visibly and reports it as missing', () => {
    const { text, missing } = resolvePlaceholders('{{job_title}} at {{company}}', {
      jobTitle: 'Engineer',
      company: '',
    });
    expect(text).toBe('Engineer at [[company]]');
    expect(missing).toEqual(['company']);
  });

  it('falls back hiring_manager to "Hiring Team" when absent', () => {
    const { text, missing } = resolvePlaceholders('Dear {{hiring_manager}},', {
      jobTitle: 'Engineer',
      company: 'Acme',
    });
    expect(text).toBe('Dear Hiring Team,');
    expect(missing).toEqual([]);
  });

  it('drops the whole sentence containing {{hook}} when hook is absent', () => {
    const { text, missing } = resolvePlaceholders(
      'Opening line. {{hook}} Middle sentence. Closing line.',
      { jobTitle: 'Engineer', company: 'Acme' }
    );
    expect(text).toBe('Opening line. Closing line.');
    expect(missing).toEqual([]);
  });

  it('resolves {{hook}} inline when present', () => {
    const { text, missing } = resolvePlaceholders('Opening. {{hook}} Closing.', {
      jobTitle: 'Engineer',
      company: 'Acme',
      hook: 'I loved your launch.',
    });
    expect(text).toBe('Opening. I loved your launch. Closing.');
    expect(missing).toEqual([]);
  });

  it('resolves {{years_experience}} from the fixed career start date, never missing', () => {
    const { text, missing } = resolvePlaceholders('{{years_experience}} years of experience', {
      jobTitle: 'Engineer',
      company: 'Acme',
    });
    expect(text).toMatch(/^\d+ years of experience$/);
    expect(missing).toEqual([]);
  });
});

describe('resolvePlaceholders portfolio_url', () => {
  it('fills the portfolio link when the item has one', () => {
    const { text, missing } = resolvePlaceholders('See {{portfolio_url}}', {
      jobTitle: 'Dev',
      company: 'Acme',
      portfolioUrl: 'https://himan.app/p/abc',
    });
    expect(text).toBe('See https://himan.app/p/abc');
    expect(missing).toEqual([]);
  });

  it('flags the token when the portfolio is off', () => {
    const { missing } = resolvePlaceholders('See {{portfolio_url}}', { jobTitle: 'Dev', company: 'Acme' });
    expect(missing).toContain('portfolio_url');
  });
});
