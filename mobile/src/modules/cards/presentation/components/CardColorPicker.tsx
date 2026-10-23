import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CARD_COLOR_PRESETS,
  cardForegroundFor,
  normalizeCardColor,
} from '@himan/shared/cards';

interface CardColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  labelClass: string;
  inputClass: string;
}

const AUTO_FACE = '#4f46e5';

// Preview strip: the color eases to the new choice (instant when reduced motion is on).
const Preview = ({ color, label }: { color: string | null; label: string }) => {
  const reduce = useReducedMotion();
  const face = color ?? AUTO_FACE;
  const progress = useSharedValue(face);
  useEffect(() => {
    progress.value = reduce ? face : withTiming(face, { duration: 250 });
  }, [face, reduce, progress]);
  const style = useAnimatedStyle(() => ({ backgroundColor: progress.value }));
  const fg = cardForegroundFor(face);
  return (
    <Animated.View style={[{ borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }, style]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: fg, opacity: 0.8, fontSize: 12 }}>Text on the card stays easy to read</Text>
    </Animated.View>
  );
};

export const CardColorPicker = ({ value, onChange, labelClass, inputClass }: CardColorPickerProps) => {
  const current = normalizeCardColor(value);
  const preset = CARD_COLOR_PRESETS.find((p) => p.hex === current);
  const [hex, setHex] = useState(current && !preset ? current : '');

  const label = !current ? 'Automatic (matches card brand)' : preset ? preset.name : `Custom ${current}`;

  const pick = (color: string | null) => {
    setHex(color && !CARD_COLOR_PRESETS.some((p) => p.hex === color) ? color : '');
    onChange(color);
  };

  const onHexChange = (text: string) => {
    setHex(text);
    const n = normalizeCardColor(text);
    if (n) onChange(n);
  };

  const hexInvalid = hex.trim() !== '' && !normalizeCardColor(hex);

  return (
    <View>
      <Text className={labelClass}>Card Color</Text>
      <Preview color={current} label={label} />
      <View className="flex-row flex-wrap gap-3 mt-3" accessibilityRole="radiogroup">
        <Pressable
          onPress={() => pick(null)}
          accessibilityRole="radio"
          accessibilityLabel="Automatic"
          accessibilityState={{ checked: !current }}
          className="h-11 w-11 rounded-full items-center justify-center border border-gray-300 dark:border-gray-600 active:opacity-70"
          style={{ backgroundColor: AUTO_FACE }}
        >
          {!current && <Feather name="check" size={20} color="#ffffff" />}
        </Pressable>
        {CARD_COLOR_PRESETS.map((p) => (
          <Pressable
            key={p.hex}
            onPress={() => pick(p.hex)}
            accessibilityRole="radio"
            accessibilityLabel={p.name}
            accessibilityState={{ checked: current === p.hex }}
            className="h-11 w-11 rounded-full items-center justify-center border border-black/10 active:opacity-70"
            style={{ backgroundColor: p.hex }}
          >
            {current === p.hex && <Feather name="check" size={20} color={cardForegroundFor(p.hex)} />}
          </Pressable>
        ))}
      </View>
      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-3 mb-1.5">
        Or type your own color code, like #1e90ff
      </Text>
      <TextInput
        placeholder="#1e90ff"
        placeholderTextColor="#9ca3af"
        value={hex}
        onChangeText={onHexChange}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={7}
        accessibilityLabel="Custom color code"
        className={inputClass}
      />
      {hexInvalid && (
        <Text className="text-xs text-red-500 mt-1">Use 6 letters or numbers, like #1e90ff</Text>
      )}
      {current && (
        <Pressable
          onPress={() => pick(null)}
          className="mt-3 self-start rounded-xl border border-gray-300 dark:border-gray-600 px-4 active:opacity-70"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">Use automatic color</Text>
        </Pressable>
      )}
    </View>
  );
};
