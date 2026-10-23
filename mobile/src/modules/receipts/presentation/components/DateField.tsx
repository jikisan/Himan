import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';

const toValue = (date: Date) => format(date, 'yyyy-MM-dd');

/** A tappable date with the system picker. `value` is yyyy-MM-dd or ''. */
export function DateField({ label, value, onChange, optional }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const pick = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: value ? parseISO(value) : new Date(), mode: 'date',
        onChange: (event, date) => { if (event.type === 'set' && date) onChange(toValue(date)); } });
    } else setOpen((o) => !o);
  };
  return <View className="gap-2">
    <View className="flex-row items-center gap-2">
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? format(parseISO(value), 'MMMM d, yyyy') : 'not set'}. Change date`} onPress={pick}
        className="min-h-12 flex-1 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <Text className={`text-base ${value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{value ? format(parseISO(value), 'MMM d, yyyy') : 'Pick a date'}</Text>
        <Text className="font-semibold text-indigo-600 dark:text-indigo-400">{open ? 'Done' : 'Change'}</Text>
      </Pressable>
      {optional && !!value && <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange('')} className="min-h-12 justify-center px-3">
        <Text className="font-semibold text-red-600 dark:text-red-400">Clear</Text></Pressable>}
    </View>
    {open && Platform.OS === 'ios' && <DateTimePicker value={value ? parseISO(value) : new Date()} mode="date" display="inline"
      style={{ height: 340, alignSelf: 'stretch' }} onChange={(_, date) => { if (date) onChange(toValue(date)); }} />}
  </View>;
}
