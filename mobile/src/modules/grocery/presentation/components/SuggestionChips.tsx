import { ScrollView, Pressable, Text, View } from 'react-native';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}

export const SuggestionChips = ({
  suggestions,
  onSelectSuggestion,
}: SuggestionChipsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-2"
      contentContainerClassName="gap-2 px-3"
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onSelectSuggestion(suggestion)}
          className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full"
        >
          <Text className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};
