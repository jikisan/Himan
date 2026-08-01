export type FriendStatus = 'pending' | 'accepted' | 'declined';
export type FriendDirection = 'incoming' | 'outgoing';

export interface FriendRowType {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_email: string;
  addressee_email: string;
  status: FriendStatus;
  created_at: string;
}

export interface FriendType {
  id: string;
  userId: string;   // the *other* person's auth user id
  email: string;    // the *other* person's email
  status: FriendStatus;
  direction: FriendDirection;
  createdAt: Date;
}
