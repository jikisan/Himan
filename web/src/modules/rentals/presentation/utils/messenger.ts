/**
 * A link for whatever was typed in "Facebook / Messenger": a profile or m.me link is used as is,
 * a username opens a Messenger chat, and a plain name becomes a Facebook search. Only http(s) links come out.
 */
export function messengerUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text
    : /^(www\.|m\.)?(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(text) ? `https://${text}` : null;
  if (withScheme) {
    try {
      const url = new URL(withScheme);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch { return null; }
  }
  const username = text.replace(/^@/, '');
  if (/^[a-z0-9.]{5,50}$/i.test(username)) return `https://m.me/${username}`;
  return `https://www.facebook.com/search/top?q=${encodeURIComponent(text)}`;
}

/** Short text to show for the saved value: a username where there is one, otherwise what kind of link it is. */
export function messengerLabel(value: string): string {
  const url = messengerUrl(value);
  const text = value.trim();
  if (!url || !/^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(text)) return text;
  const { hostname, pathname, searchParams } = new URL(url);
  const parts = pathname.split('/').filter(Boolean);
  const isChat = /(^|\.)(messenger\.com|m\.me)$/i.test(hostname);
  // m.me/<name> and messenger.com/t/<name>; facebook.com/<name> (not profile.php?id=…).
  const name = isChat ? (hostname.endsWith('m.me') ? parts[0] : parts[parts.indexOf('t') + 1]) : (parts[0] !== 'profile.php' && !searchParams.has('id') ? parts[0] : undefined);
  if (name && /^[a-z][a-z0-9.]{3,49}$/i.test(name)) return `@${name}`;
  return isChat ? 'Messenger chat' : 'Facebook profile';
}
