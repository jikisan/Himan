// {userId}/{shareToken}/ — the random shareToken is both the unguessable
// path segment and the revocation handle (rotating it deletes this folder).
export function buildShareFolder(userId: string, shareToken: string): string {
  return `${userId}/${shareToken}`;
}

// {userId}/{shareToken}/{file}. Filenames are identical across every item
// on purpose.
export function buildStoragePath(
  userId: string,
  shareToken: string,
  file: 'letter.html' | 'cv.pdf'
): string {
  return `${buildShareFolder(userId, shareToken)}/${file}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Never hardcode a name here — the schema is user_id-scoped throughout.
export function buildDownloadFilename(
  fullName: string | undefined,
  kind: 'cover_letter' | 'cv'
): string {
  const ext = kind === 'cv' ? 'pdf' : 'html';
  const label = kind === 'cv' ? 'cv' : 'cover-letter';
  const slug = fullName ? slugify(fullName) : '';
  return slug ? `${slug}-${label}.${ext}` : `${label}.${ext}`;
}
