/**
 * URL Utilities
 *
 * Provides safe URL handling to prevent security vulnerabilities
 */

/**
 * Checks if a URL is safe to open (only http: and https: protocols)
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe, false otherwise
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    // Invalid URL format
    return false;
  }
};

/**
 * Safely opens a URL in a new tab if it uses http: or https:
 * Prevents javascript:, data:, and other potentially dangerous protocols
 *
 * @param url - The URL to open
 * @returns true if opened successfully, false if rejected
 */
export const safeOpenUrl = (url: string): boolean => {
  if (!isSafeUrl(url)) {
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
