import { getSupabase } from '../../../../config/index.js';
import type { GroceryInvitationType } from '../../domain/index.js';

export class GroceryInvitationRepository {
  async findByListId(listId: string): Promise<GroceryInvitationType[]> {
    const { data, error } = await getSupabase()
      .from('grocery_invitations')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findPendingForUser(email: string): Promise<GroceryInvitationType[]> {
    const { data, error } = await getSupabase()
      .from('grocery_invitations')
      .select(`
        *,
        grocery_lists(name)
      `)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending invitations: ${error.message}`);
    }

    return (data || []).map((row) => {
      const lists = row.grocery_lists as { name: string } | null;
      return {
        ...this.mapToEntity(row),
        listName: lists?.name,
      };
    });
  }

  async create(listId: string, invitedEmail: string, invitedBy: string): Promise<GroceryInvitationType> {
    const { data, error } = await getSupabase()
      .from('grocery_invitations')
      .insert({
        list_id: listId,
        invited_email: invitedEmail,
        invited_by: invitedBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async accept(invitationId: string, userId: string): Promise<void> {
    // Get the invitation
    const { data: invitation, error: fetchError } = await getSupabase()
      .from('grocery_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch invitation: ${fetchError.message}`);
    }

    // Add user as member
    const { error: memberError } = await getSupabase()
      .from('grocery_list_members')
      .insert({
        list_id: invitation.list_id,
        user_id: userId,
        role: 'editor',
        invited_by: invitation.invited_by,
      });

    if (memberError) {
      throw new Error(`Failed to add member: ${memberError.message}`);
    }

    // Update invitation status
    const { error: updateError } = await getSupabase()
      .from('grocery_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) {
      throw new Error(`Failed to update invitation: ${updateError.message}`);
    }
  }

  async decline(invitationId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to decline invitation: ${error.message}`);
    }
  }

  async cancel(invitationId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to cancel invitation: ${error.message}`);
    }
  }

  async removeMember(listId: string, userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_list_members')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  async getMembers(listId: string): Promise<Array<{ id: string; userId: string; role: string; joinedAt: Date }>> {
    const { data, error } = await getSupabase()
      .from('grocery_list_members')
      .select('*')
      .eq('list_id', listId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      role: row.role as string,
      joinedAt: new Date(row.joined_at as string),
    }));
  }

  private mapToEntity(data: Record<string, unknown>): GroceryInvitationType {
    return {
      id: data.id as string,
      listId: data.list_id as string,
      invitedBy: data.invited_by as string,
      invitedEmail: data.invited_email as string,
      status: data.status as 'pending' | 'accepted' | 'declined',
      createdAt: new Date(data.created_at as string),
    };
  }
}
