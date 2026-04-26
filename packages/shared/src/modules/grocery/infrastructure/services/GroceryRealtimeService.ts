import { getSupabase } from '../../../../config/index.js';
import type { SessionPresence } from '../../domain/index.js';

type RealtimeChannel = ReturnType<ReturnType<typeof getSupabase>['channel']>;

export class GroceryRealtimeService {
  private itemsChannel: RealtimeChannel | null = null;
  private sessionChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;

  subscribeToItems(
    listId: string,
    onChange: () => void
  ): void {
    this.unsubscribeFromItems();

    this.itemsChannel = getSupabase()
      .channel(`grocery-list:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `list_id=eq.${listId}`,
        },
        () => onChange()
      )
      .subscribe();
  }

  unsubscribeFromItems(): void {
    if (this.itemsChannel) {
      getSupabase().removeChannel(this.itemsChannel);
      this.itemsChannel = null;
    }
  }

  subscribeToSessions(
    userId: string,
    onChange: () => void
  ): void {
    this.unsubscribeFromSessions();

    this.sessionChannel = getSupabase()
      .channel(`grocery-sessions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_sessions',
          filter: `started_by=eq.${userId}`,
        },
        () => onChange()
      )
      .subscribe();
  }

  unsubscribeFromSessions(): void {
    if (this.sessionChannel) {
      getSupabase().removeChannel(this.sessionChannel);
      this.sessionChannel = null;
    }
  }

  subscribeToPresence(
    sessionId: string,
    userId: string,
    displayName: string,
    onSync: (presences: SessionPresence[]) => void
  ): void {
    this.unsubscribeFromPresence();

    this.presenceChannel = getSupabase()
      .channel(`grocery-session:${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        if (!this.presenceChannel) return;
        const state = this.presenceChannel.presenceState();
        const presences: SessionPresence[] = [];

        for (const key in state) {
          const entries = state[key] as unknown as Array<SessionPresence>;
          for (const entry of entries) {
            presences.push({
              userId: entry.userId,
              displayName: entry.displayName,
              onlineAt: entry.onlineAt,
            });
          }
        }

        onSync(presences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel?.track({
            userId,
            displayName,
            onlineAt: new Date().toISOString(),
          });
        }
      });
  }

  unsubscribeFromPresence(): void {
    if (this.presenceChannel) {
      getSupabase().removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
  }

  unsubscribeAll(): void {
    this.unsubscribeFromItems();
    this.unsubscribeFromSessions();
    this.unsubscribeFromPresence();
  }
}
