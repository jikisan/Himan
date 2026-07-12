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
        style={{ flex: 1 }}
        className={`rounded-2xl overflow-hidden active:opacity-75 ${
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-950/40'
            : 'bg-white dark:bg-gray-800'
        }`}
      >
        <View className="p-4 gap-3">
          {/* Top row: icon + menu */}
          <View className="flex-row items-start justify-between">
            <View className={`w-9 h-9 rounded-xl items-center justify-center ${
              isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-indigo-50 dark:bg-indigo-900/30'
            }`}>
              <Feather name="shopping-bag" size={16} color="#6366f1" />
            </View>
            <Pressable
              onPress={() => setShowMenu(true)}
              className="p-1 -mt-1 -mr-1 active:opacity-50"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Feather name="more-horizontal" size={16} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Name + meta */}
          <View className="gap-0.5">
            <Text
              className="font-semibold text-sm text-gray-900 dark:text-white leading-snug"
              numberOfLines={2}
            >
              {list.name}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {entity.progressLabel}
              </Text>
              {entity.isShared && (
                <View className="flex-row items-center gap-0.5">
                  <Feather name="users" size={10} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {list.memberCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Progress bar — flush to bottom */}
        <View className="h-1 bg-gray-100 dark:bg-gray-700">
          {entity.itemCount > 0 && (
            <View
              className={`h-1 ${progress >= 100 ? 'bg-green-400' : 'bg-indigo-400'}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          )}
        </View>
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
