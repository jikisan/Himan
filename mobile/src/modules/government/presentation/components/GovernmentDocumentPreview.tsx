import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import type { GovernmentDocument } from '@himan/shared/government';

export function GovernmentDocumentPreview({ document, userId, documentUrl, onOpen, openLabel, iconColor }: {
  document: GovernmentDocument; userId: string; documentUrl: (id: string) => Promise<string>;
  onOpen: () => void; openLabel?: string; iconColor: string;
}) {
  const [failed, setFailed] = useState(false);
  const isImage = document.mimeType.startsWith('image/');
  const preview = useQuery({
    queryKey: ['government-preview', userId, document.id], queryFn: () => documentUrl(document.id),
    enabled: document.ready && isImage, meta: { sensitive: true }, gcTime: 0, staleTime: 45000,
    refetchInterval: 45000, retry: false,
  });
  return <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${document.name}`} onPress={onOpen}
    className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 active:opacity-70"
    style={{ aspectRatio: 1.6 }}>
    {preview.isLoading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={iconColor} /></View>
      : preview.data && !failed ? <Image accessible={false} source={{ uri: preview.data, cache: 'reload' }} resizeMode="contain" className="h-full w-full" onError={() => setFailed(true)} />
      : <View className="flex-1 items-center justify-center gap-2 p-4"><Feather accessible={false} name="file-text" size={28} color={iconColor} />
          <Text className="text-sm text-gray-600 dark:text-gray-300">{isImage ? 'Preview unavailable' : 'PDF document'}</Text></View>}
    <View className="absolute bottom-2 right-2 rounded-lg bg-white px-3 py-2"><Text className="text-xs text-gray-900">{openLabel ?? (isImage ? 'Open image' : 'Open PDF')}</Text></View>
  </Pressable>;
}
