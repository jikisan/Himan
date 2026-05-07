import { View, Text, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GroceryListCard } from './GroceryListCard';

interface ListsSectionProps {
  activeLists: any[];
  archivedLists: any[];
  userId: string;
  showArchived: boolean;
  onToggleArchived: () => void;
  onSelectList: (id: string) => void;
  onRenameList: (id: string, name: string) => void;
  onArchiveList: (id: string, isArchived: boolean) => void;
  onDeleteList: (id: string) => void;
  onLeaveList: (id: string) => void;
}

export function ListsSection({
  activeLists,
  archivedLists,
  userId,
  showArchived,
  onToggleArchived,
  onSelectList,
  onRenameList,
  onArchiveList,
  onDeleteList,
  onLeaveList,
}: ListsSectionProps) {
  const renderListCard = ({ item }: { item: any }) => {
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
      <View className="px-3 mt-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Lists
        </Text>
        {activeLists.length === 0 ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No lists yet. Create one to get started!
          </Text>
        ) : (
          <FlatList
            data={activeLists}
            renderItem={renderListCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerClassName="gap-2"
          />
        )}
      </View>

      {archivedLists.length > 0 && (
        <View className="px-3 mt-6 mb-4">
          <Pressable
            onPress={onToggleArchived}
            className="flex flex-row items-center gap-2 mb-2"
          >
            {showArchived ? (
              <Feather name="chevron-down" size={16} color="#6b7280" />
            ) : (
              <Feather name="chevron-right" size={16} color="#6b7280" />
            )}
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Archived ({archivedLists.length})
            </Text>
          </Pressable>
          {showArchived && (
            <FlatList
              data={archivedLists}
              renderItem={renderListCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerClassName="gap-2"
            />
          )}
        </View>
      )}
    </>
  );
}
