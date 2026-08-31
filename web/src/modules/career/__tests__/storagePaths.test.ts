import { describe, it, expect } from 'vitest';
import { buildStoragePath, buildDownloadFilename } from '@himan/shared/career';

describe('buildStoragePath', () => {
  it('builds the userId/shareToken/file path', () => {
    expect(buildStoragePath('user-1', 'tok123', 'letter.html')).toBe('user-1/tok123/letter.html');
    expect(buildStoragePath('user-1', 'tok123', 'cv.pdf')).toBe('user-1/tok123/cv.pdf');
  });
});

describe('buildDownloadFilename', () => {
  it('slugifies the full name', () => {
    expect(buildDownloadFilename('Kyle Santerna', 'cv')).toBe('kyle-santerna-cv.pdf');
    expect(buildDownloadFilename('Kyle Santerna', 'cover_letter')).toBe('kyle-santerna-cover-letter.html');
  });

  it('falls back to a generic filename when no name is given', () => {
    expect(buildDownloadFilename(undefined, 'cv')).toBe('cv.pdf');
    expect(buildDownloadFilename('', 'cover_letter')).toBe('cover-letter.html');
  });
});
