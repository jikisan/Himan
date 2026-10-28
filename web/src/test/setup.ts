import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// The 1s default flakes on busy CI runners (e.g. hashing then signing took over 1s); a real failure still fails, just later.
configure({ asyncUtilTimeout: 5000 });

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// happy-dom 21 rejects an animation's `finished` promise when it is cancelled, and nothing handles it, so Vitest fails the run
// on an "unhandled rejection" (motion cancels animations on unmount). Browsers treat that rejection as handled.
if (typeof Animation !== 'undefined') {
  const cancelAnimation = Animation.prototype.cancel;
  Animation.prototype.cancel = function cancel(this: Animation) {
    this.finished.catch(() => undefined);
    return cancelAnimation.call(this);
  };
}
