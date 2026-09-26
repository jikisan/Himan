export const getCallbackError = (search: string, hash: string): string | null => {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.slice(1));
  return query.get('error_description') || fragment.get('error_description')
    || (query.has('error') || fragment.has('error') ? 'Google sign-in failed. Please try again.' : null);
};
