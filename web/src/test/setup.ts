import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// The 1s default flakes on busy CI runners (e.g. hashing then signing took over 1s); a real failure still fails, just later.
configure({ asyncUtilTimeout: 5000 });

// Cleanup after each test
afterEach(() => {
  cleanup();
});
