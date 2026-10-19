import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { ID_PATH, linkDetailsSchema, signatureSchema, validateRentalFile } from '../domain/index.js';
import type { LinkDetails, LinkKind, SignMode, TenancyLink } from '../domain/index.js';
import { fileName, linkRow, publicLinkSchema, rentalError } from './rows.js';
import type { PublicLink } from './rows.js';
import { RenterRepository } from './RenterRepository.js';

const UPLOADS = 'rental-link-uploads';
const LINKS = 'rental_tenancy_links';

/** Manager methods use the signed-in client; the public ones only call token-keyed RPCs and the uploads bucket,
 * so they work with the anonymous client on the renter page. */
export class LinkRepository {
  /** Returns the new token; an existing link for the tenancy is replaced (its old token stops working). */
  async createLink(tenancyId: string, kind: LinkKind): Promise<string> {
    const { data, error } = await getSupabase().rpc('rental_create_link', { p_tenancy_id: tenancyId, p_kind: kind });
    if (error) throw rentalError(error, 'Could not create the link');
    return z.string().parse(data);
  }

  async revoke(tenancyId: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_revoke_link', { p_tenancy_id: tenancyId });
    if (error) throw rentalError(error, 'Could not turn off the link');
  }

  /** Deletes the tenant's old ID uploads (best effort; the database restarts the 3-file count anyway), then reopens. */
  async reopen(tenancyId: string): Promise<void> {
    const { data } = await getSupabase().from(LINKS).select('*').eq('tenancy_id', tenancyId).maybeSingle();
    const paths = data ? linkRow.parse(data).submittedDetails?.idPaths ?? [] : [];
    if (paths.length) await getSupabase().storage.from(UPLOADS).remove(paths).catch(() => undefined);
    const { error } = await getSupabase().rpc('rental_reopen_link', { p_tenancy_id: tenancyId });
    if (error) throw rentalError(error, 'Could not reopen the link');
  }

  async findAll(): Promise<TenancyLink[]> {
    const { data, error } = await getSupabase().from(LINKS).select('*').order('created_at', { ascending: false });
    if (error) throw rentalError(error, 'Could not load the links');
    return z.array(linkRow).parse(data);
  }

  /** Copies the tenant's ID files into their files, then lets the database copy the details onto the renter. */
  async acceptDetails(tenancyId: string): Promise<void> {
    const { data, error } = await getSupabase().from(LINKS).select('*').eq('tenancy_id', tenancyId).single();
    if (error) throw rentalError(error, 'Could not accept the details');
    const link = linkRow.parse(data);
    if (link.status !== 'submitted' || !link.submittedDetails) throw new Error('There are no details to review');
    const { data: tenancy, error: tenancyError } = await getSupabase().from('rental_tenancies').select('renter_id, property_id')
      .eq('id', tenancyId).single();
    if (tenancyError) throw rentalError(tenancyError, 'Could not accept the details');
    const { renter_id: renterId, property_id: propertyId } = z.object({ renter_id: z.string(), property_id: z.string() }).parse(tenancy);
    const uploads = getSupabase().storage.from(UPLOADS);
    const paths = link.submittedDetails.idPaths;
    // The tenant chose these strings: only plain files in this link's own folder are ever downloaded.
    if (paths.some((path) => !ID_PATH.test(path) || !path.startsWith(`${link.token}/`))) {
      throw new Error('These details can’t be accepted. Ask the tenant to send them again.');
    }
    // Copy before accepting: a failed copy leaves the details waiting, so Accept can be tried again.
    // ponytail: a retry after a partial copy can attach an ID twice; the manager removes the extra file.
    try {
      for (const [i, path] of paths.entries()) {
        const { data: blob, error: downloadError } = await uploads.download(path);
        if (downloadError) throw downloadError;
        const ext = path.split('.').pop() ?? '';
        await new RenterRepository().upload(renterId, propertyId,
          { name: `ID ${i + 1}.${ext}`, mimeType: blob.type || null, bytes: await blob.arrayBuffer() });
      }
    } catch (copyError) {
      throw rentalError(copyError, 'Could not copy the ID files. Try Accept again.');
    }
    const { error: acceptError } = await getSupabase().rpc('rental_accept_details', { p_tenancy_id: tenancyId });
    if (acceptError) throw rentalError(acceptError, 'Could not accept the details');
    // The copies are safe in rental-files; leftovers here are only clutter, so a failed cleanup is ignored.
    await uploads.remove(paths).catch(() => undefined);
  }

  async getPublic(token: string): Promise<PublicLink> {
    const { data, error } = await getSupabase().rpc('rental_link_get', { p_token: token });
    if (error) throw rentalError(error, 'Could not open this link');
    return publicLinkSchema.parse(data);
  }

  /** Uploads one ID file into the link's folder; returns its path for `submitDetails`. */
  async uploadId(token: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<string> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    // UUID-shaped (8-4-4-4-12 hex): the bucket's insert policy (rental_link_can_upload) accepts nothing else.
    const path = `${token}/${fileName(mimeType).replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-')}`;
    const { error } = await getSupabase().storage.from(UPLOADS).upload(path, file.bytes, { contentType: mimeType, upsert: false, cacheControl: '0' });
    if (error) throw rentalError(error, 'Could not upload the ID. You can add up to 3 files while the link is open.');
    return path;
  }

  async submitDetails(token: string, details: LinkDetails): Promise<void> {
    const { error } = await getSupabase().rpc('rental_link_submit_details', { p_token: token, p_details: linkDetailsSchema.parse(details) });
    if (error) throw rentalError(error, 'Could not send your details');
  }

  /** `signMode`: the mode the page showed. For contracts sent before the owner chose one (sign mode null) it is the tenant's choice;
   * otherwise the database uses the owner's and refuses a different one as a stale page.
   * `contentHash` = `sha256Hex(canonicalText(body, specialTerms))` of the text the tenant was shown; the database refuses a stale one. */
  async sign(token: string, input: { name: string; signMode: SignMode; signature: string; userAgent: string; contentHash: string }): Promise<void> {
    if (!/^[0-9a-f]{64}$/.test(input.contentHash)) throw new Error('Please reload the page to read the latest contract');
    const name = z.string().trim().min(1, 'Type your full name').max(160).parse(input.name);
    const { error } = await getSupabase().rpc('rental_link_sign', { p_token: token, p_name: name, p_sign_mode: input.signMode,
      p_signature: signatureSchema.parse(input.signature), p_user_agent: input.userAgent.slice(0, 500),
      p_content_hash: input.contentHash });
    if (error) throw rentalError(error, 'Could not sign the contract');
  }
}
