import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { CertificateType, CreateCertificateDto, UpdateCertificateDto } from '../../domain/types/index.js';

function toDateString(date: Date | null | undefined): string | null | undefined {
  if (date === undefined) return undefined;
  return date ? date.toISOString().slice(0, 10) : null;
}

export class CertificateRepository {
  async findAll(userId: string): Promise<CertificateType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_certificates')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching certificates', error);
      throw new Error('Failed to fetch certificates');
    }
  }

  async create(dto: CreateCertificateDto): Promise<CertificateType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('profile_certificates')
        .insert({
          user_id: dto.userId,
          name: dto.name,
          issuer: dto.issuer ?? null,
          issue_date: toDateString(dto.issueDate) ?? null,
          expiry_date: toDateString(dto.expiryDate) ?? null,
          credential_id: dto.credentialId ?? null,
          credential_url: dto.credentialUrl ?? null,
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating certificate', error);
      throw new Error('Failed to create certificate');
    }
  }

  async update(id: string, userId: string, dto: UpdateCertificateDto): Promise<CertificateType> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_certificates')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.issuer !== undefined && { issuer: dto.issuer }),
          ...(dto.issueDate !== undefined && { issue_date: toDateString(dto.issueDate) }),
          ...(dto.expiryDate !== undefined && { expiry_date: toDateString(dto.expiryDate) }),
          ...(dto.credentialId !== undefined && { credential_id: dto.credentialId }),
          ...(dto.credentialUrl !== undefined && { credential_url: dto.credentialUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating certificate', error);
      throw new Error('Failed to update certificate');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('profile_certificates')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting certificate', error);
      throw new Error('Failed to delete certificate');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase().from('profile_certificates').update({ position: index }).eq('id', id).eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering certificates', error);
      throw new Error('Failed to reorder certificates');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('profile_certificates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): CertificateType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      issuer: (data.issuer as string) ?? null,
      issueDate: data.issue_date ? new Date(data.issue_date as string) : null,
      expiryDate: data.expiry_date ? new Date(data.expiry_date as string) : null,
      credentialId: (data.credential_id as string) ?? null,
      credentialUrl: (data.credential_url as string) ?? null,
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
