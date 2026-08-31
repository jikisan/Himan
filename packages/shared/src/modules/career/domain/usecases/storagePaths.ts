// {userId}/{shareToken}/ — the random shareToken is both the unguessable
// path segment and the revocation handle (rotating it deletes this folder).
export function buildShareFolder(userId: string, shareToken: string): string {
  return `${userId}/${shareToken}`;
}

// {userId}/{shareToken}/cv.pdf. The cover letter itself is never persisted
// to storage — job title/company change per application, so a shared file
// path would let an old recipient's link start showing a different
// company's letter once the item is reused and regenerated.
export function buildStoragePath(userId: string, shareToken: string, file: 'cv.pdf'): string {
  return `${buildShareFolder(userId, shareToken)}/${file}`;
}
