import { expect, it } from 'vitest';
import { getCallbackError } from './getCallbackError';

it('reads Supabase OAuth rejection from query or fragment', () => {
  expect(getCallbackError('?error=access_denied&error_description=Registration+is+by+invitation+only.', ''))
    .toBe('Registration is by invitation only.');
  expect(getCallbackError('', '#error=access_denied&error_description=Registration+is+by+invitation+only.'))
    .toBe('Registration is by invitation only.');
  expect(getCallbackError('?error=access_denied', '')).toBe('Google sign-in failed. Please try again.');
  expect(getCallbackError('', '')).toBeNull();
});
