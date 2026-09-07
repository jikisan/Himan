import { useMemo } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GrocerySession } from '@himan/shared/grocery';
import type { SessionItemType } from '@himan/shared/grocery';
import { useErrandSession } from '@/modules/grocery/presentation/hooks/useErrandSession';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import { ErrandEmptyState } from './ErrandEmptyState';
import { ErrandSessionHeader } from './ErrandSessionHeader';
import { ErrandItemList } from './ErrandItemList';
import { ErrandSummaryBar } from './ErrandSummaryBar';

export function ErrandSessionScreen() {
  const router = useRouter();
  const { session, isLoading, togglePurchase, updateItem, completeErrand, cancelErrand } =
    useErrandSession();

  const errand = useMemo(() => (session ? new GrocerySession(session) : null), [session]);

  const groups = useMemo(() => {
    const map = new Map<string, SessionItemType[]>();
    for (const item of session?.items ?? []) {
      const key = item.category || 'Other';
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [session]);

  if (!isLoading && !errand) {
    return <ErrandEmptyState />;
  }

  const confirmComplete = () =>
    Alert.alert('Finish errand?', 'Records prices to your catalog and closes this errand.', [
      { text: 'Keep shopping', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          await completeErrand();
          router.back();
        },
      },
    ]);

  const confirmCancel = () =>
    Alert.alert('Discard errand?', 'This errand and its progress will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await cancelErrand();
          router.back();
        },
      },
    ]);

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ErrandSessionHeader errand={errand} />
        <ErrandItemList groups={groups} onToggle={togglePurchase} onUpdate={updateItem} />
        <ErrandSummaryBar
          estimatedTotal={errand?.estimatedTotal ?? 0}
          actualTotal={errand?.actualTotal ?? 0}
          onDiscard={confirmCancel}
          onFinish={confirmComplete}
        />
      </SafeAreaView>
    </PaperSurface>
  );
}
