import { getSupabase } from '../../../../config/index.js';
import { mapFriendRow } from '../../domain/index.js';
import type { FriendRowType, FriendType } from '../../domain/index.js';

// Maps a raised Postgres exception message to a friendly error.
function friendlyError(message: string): Error {
  const map: Record<string, string> = {
    USER_NOT_FOUND: 'No account found with that email.',
    CANNOT_FRIEND_SELF: "You can't add yourself.",
    ALREADY_FRIENDS: "You're already friends.",
    REQUEST_ALREADY_PENDING: 'A request between you two is already pending.',
  };
  for (const key of Object.keys(map)) {
    if (message.includes(key)) return new Error(map[key]);
  }
  return new Error('Failed to send friend request.');
}

export class FriendRepository {
  async sendRequest(email: string): Promise<void> {
    const { error } = await getSupabase().rpc('send_friend_request', {
      lookup_email: email.trim().toLowerCase(),
    });
    if (error) throw friendlyError(error.message);
  }

  async getFriends(currentUserId: string): Promise<FriendType[]> {
    const { data, error } = await getSupabase().rpc('get_friends');
    if (error) throw new Error(`Failed to fetch friends: ${error.message}`);
    return ((data as FriendRowType[]) || []).map((r) => mapFriendRow(r, currentUserId));
  }

  async getRequests(currentUserId: string): Promise<FriendType[]> {
    const { data, error } = await getSupabase().rpc('get_friend_requests');
    if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
    return ((data as FriendRowType[]) || []).map((r) => mapFriendRow(r, currentUserId));
  }

  async accept(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to accept request: ${error.message}`);
  }

  async decline(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to decline request: ${error.message}`);
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to cancel request: ${error.message}`);
  }

  async remove(friendshipId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw new Error(`Failed to remove friend: ${error.message}`);
  }
}
