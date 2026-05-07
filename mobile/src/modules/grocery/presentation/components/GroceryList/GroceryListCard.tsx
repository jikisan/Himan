import { useState } from 'react';
import { View, Text, Pressable, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';
import { GroceryList } from '@himan/shared/grocery';

interface GroceryListCardProps {
  list: GroceryListType;
  isSelected: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

export const GroceryListCard = ({
  list,
  isSelected,
  isOwner,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onLeave,
}: GroceryListCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const entity = new GroceryList(list);
  const progress = entity.itemCount > 0 ? entity.progress * 100 : 0;

  const handleMenuAction = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  return (
    <>
      <Pressable
        onPress={onSelect}
        onLongPress={() => setShowMenu(true)}
        className={`flex flex-col gap-2.5 p-3.5 rounded-xl border ${
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
            : 'border-transparent bg-white dark:bg-gray-800'
        }`}
      >
        <View className="flex flex-row items-start justify-between gap-2">
          <View className="flex-1 min-w-0">
            <Text className="font-semibold text-sm text-gray-900 dark:text-white" numberOfLines={1}>
              {list.name}
            </Text>
            <View className="flex flex-row items-center gap-2 mt-0.5">
              <Text className="text-xs text-gray-500 dark:text-gray-400">{entity.progressLabel}</Text>
              {entity.isShared && (
                <View className="flex flex-row items-center gap-0.5">
                  <Feather name="users" size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{list.memberCount}</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable onPress={() => setShowMenu(true)} className="p-1 -mr-1">
            <Feather name="more-vertical" size={16} color="#6b7280" />
          </Pressable>
        </View>

        {entity.itemCount > 0 && (
          <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <View
              className="bg-indigo-500 rounded-full h-1"
              style={{ width: `${progress}%` }}
            />
          </View>
        )}

        <Text className="text-[11px] text-gray-400 dark:text-gray-500">{entity.getRelativeTime()}</Text>
      </Pressable>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowMenu(false)}
        >
          <Pressable className="bg-white dark:bg-gray-900 rounded-t-2xl p-4">
            <Pressable
              onPress={() => handleMenuAction(onRename)}
              className="flex flex-row items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800"
            >
              <Feather name="edit-2" size={18} color="#374151" />
              <Text className="text-base text-gray-900 dark:text-white">Rename</Text>
            </Pressable>

            {isOwner && (
              <Pressable
                onPress={() => handleMenuAction(onArchive)}
                className="flex flex-row items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800"
              >
                <Feather name="archive" size={18} color="#374151" />
                <Text className="text-base text-gray-900 dark:text-white">
                  {list.isArchived ? 'Unarchive' : 'Archive'}
                </Text>
              </Pressable>
            )}

            {isOwner ? (
              <Pressable
                onPress={() => {
                  setShowMenu(false);
                  Alert.alert(`Delete "${list.name}"`, `Are you sure you want to delete "${list.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: onDelete },
                  ]);
                }}
                className="flex flex-row items-center gap-3 p-3"
              >
                <Feather name="trash-2" size={18} color="#ef4444" />
                <Text className="text-base text-red-500">Delete</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setShowMenu(false);
                  Alert.alert('Leave List', 'Are you sure you want to leave this list?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: onLeave },
                  ]);
                }}
                className="flex flex-row items-center gap-3 p-3"
              >
                <Feather name="log-out" size={18} color="#ef4444" />
                <Text className="text-base text-red-500">Leave</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
