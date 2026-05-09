import { View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GroceryListEmptyState } from './GroceryListEmptyState';
import { GroceryListCard } from './GroceryListCard';

interface ListsSectionProps {
  activeLists: any[];
  archivedLists: any[];
  userId: string;
  showArchived: boolean;
  isCreating: boolean;
  newListName: string;
  onToggleArchived: () => void;
  onSelectList: (id: string) => void;
  onRenameList: (id: string, name: string) => void;
  onArchiveList: (id: string, isArchived: boolean) => void;
  onDeleteList: (id: string) => void;
  onLeaveList: (id: string) => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
  onChangeListName: (text: string) => void;
  onSubmitList: () => void;
}

export function ListsSection({
  activeLists,
  archivedLists,
  userId,
  showArchived,
  isCreating,
  newListName,
  onToggleArchived,
  onSelectList,
  onRenameList,
  onArchiveList,
  onDeleteList,
  onLeaveList,
  onStartCreating,
  onCancelCreating,
  onChangeListName,
  onSubmitList,
}: ListsSectionProps) {
  const pad = (data: any[]) =>
    data.length % 2 !== 0 ? [...data, { id: '__placeholder__' }] : data;

  const renderListCard = ({ item }: { item: any }) => {
    if (item.id === '__placeholder__') return <View style={{ flex: 1 }} />;
    const isOwner = item.ownerId === userId;
    return (
      <GroceryListCard
        list={item}
        isSelected={false}
        isOwner={isOwner}
        onSelect={() => onSelectList(item.id)}
        onRename={() => onRenameList(item.id, item.name)}
        onArchive={() => onArchiveList(item.id, item.isArchived)}
        onDelete={() => onDeleteList(item.id)}
        onLeave={() => onLeaveList(item.id)}
      />
    );
  };

  return (
    <>
      <View className="px-3 mt-10">
        {/* Section header */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Lists
          </Text>
          {!isCreating && (
            <Pressable
              onPress={onStartCreating}
              className="w-6 h-6 rounded-full bg-indigo-500 items-center justify-center active:bg-indigo-600"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Feather name="plus" size={13} color="#ffffff" />
            </Pressable>
          )}
        </View>

        {/* Inline create input */}
        {isCreating && (
          <View className="flex-row gap-2 mb-3">
            <TextInput
              placeholder="List name..."
              placeholderTextColor="#9ca3af"
              value={newListName}
              onChangeText={onChangeListName}
              onSubmitEditing={onSubmitList}
              autoFocus
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            />
            <Pressable
              onPress={onSubmitList}
              className="bg-indigo-500 rounded-xl px-3.5 justify-center active:bg-indigo-600"
            >
              <Feather name="check" size={16} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={onCancelCreating}
              className="bg-gray-200 dark:bg-gray-700 rounded-xl px-3.5 justify-center active:opacity-70"
            >
              <Feather name="x" size={16} color="#6b7280" />
            </Pressable>
          </View>
        )}

        {activeLists.length === 0 ? (
          <GroceryListEmptyState
            type="no-items"
            message="No lists yet"
            subMessage="Create one to get started"
          />
        ) : (
          <FlatList
            data={pad(activeLists)}
            renderItem={renderListCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={true}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10 }}
          />
        )}
      </View>

      {archivedLists.length > 0 && (
        <View className="px-3 mt-6 mb-4">
          <Pressable
            onPress={onToggleArchived}
            className="flex-row items-center gap-1.5 self-start py-1 active:opacity-60"
          >
            <Feather
              name={showArchived ? 'chevron-down' : 'chevron-right'}
              size={14}
              color="#9ca3af"
            />
            <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Archived
            </Text>
            <View className="bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
              <Text className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {archivedLists.length}
              </Text>
            </View>
          </Pressable>

          {showArchived && (
            <View className="mt-2">
              <FlatList
                data={pad(archivedLists)}
                renderItem={renderListCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={{ gap: 10 }}
                contentContainerStyle={{ gap: 10 }}
              />
            </View>
          )}
        </View>
      )}
    </>
  );
}
