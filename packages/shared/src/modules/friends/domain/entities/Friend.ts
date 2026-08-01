import type { FriendRowType, FriendType } from '../types/index.js';

export function mapFriendRow(row: FriendRowType, currentUserId: string): FriendType {
  const isRequester = row.requester_id === currentUserId;
  return {
    id: row.id,
    userId: isRequester ? row.addressee_id : row.requester_id,
    email: isRequester ? row.addressee_email : row.requester_email,
    status: row.status,
    direction: isRequester ? 'outgoing' : 'incoming',
    createdAt: new Date(row.created_at),
  };
}
