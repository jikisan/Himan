import { describe, it, expect } from 'vitest';
import { buildStoragePath } from '@himan/shared/career';

describe('buildStoragePath', () => {
  it('builds the userId/shareToken/file path', () => {
    expect(buildStoragePath('user-1', 'tok123', 'cv.pdf')).toBe('user-1/tok123/cv.pdf');
  });
});
