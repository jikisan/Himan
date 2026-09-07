// Short CV link: himan.app/cv/<shareToken> -> 302 to a fresh signed URL.
// Runs as a Cloudflare Pages Function (takes precedence over the SPA fallback
// in public/_redirects for this exact path). Uses the service-role key so it
// can look up the item across users; the 122-bit share_token is the secret.
// Rotating the token deletes the old row's match here -> old link 404s, which
// is the revocation.
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const BUCKET = 'career';
const EXPIRY_SECONDS = 60 * 60; // recruiter opens immediately; short-lived is fine

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const token = String(params.token ?? '');
  if (!/^[a-f0-9]{32}$/i.test(token)) return new Response('Not found', { status: 404 });

  const base = env.SUPABASE_URL;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const lookup = await fetch(
    `${base}/rest/v1/career_items?share_token=eq.${token}&select=cv_file_path&limit=1`,
    { headers }
  );
  const rows = lookup.ok ? ((await lookup.json()) as { cv_file_path: string | null }[]) : [];
  const path = rows[0]?.cv_file_path;
  if (!path) return new Response('Not found', { status: 404 });

  const sign = await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: EXPIRY_SECONDS }),
  });
  if (!sign.ok) return new Response('Not found', { status: 404 });
  const { signedURL } = (await sign.json()) as { signedURL: string };

  return Response.redirect(`${base}/storage/v1${signedURL}`, 302);
};
