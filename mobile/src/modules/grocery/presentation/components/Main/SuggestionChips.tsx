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
          className="px-3 py-1.5 bg-sticky dark:bg-sticky-dark rounded-sm"
        >
          <Text className="text-[14px] font-serif text-accent-text dark:text-accent-textdark">
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};
