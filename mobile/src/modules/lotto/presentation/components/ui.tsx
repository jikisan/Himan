import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';

export const text = 'text-gray-900 dark:text-white';
export const muted = 'text-gray-500 dark:text-gray-400';
export const card = 'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800';

export function useIconColor() {
  return useColorScheme().colorScheme === 'dark' ? '#e5e7eb' : '#111827';
}

type Icon = React.ComponentProps<typeof Feather>['name'];

/** A labelled button, 48pt tall. */
export function Btn({ label, icon, onPress, primary, danger, disabled, grow, small }: {
  label: string; icon?: Icon; onPress(): void; primary?: boolean; danger?: boolean; disabled?: boolean; grow?: boolean; small?: boolean;
}) {
  const base = useIconColor();
  const color = primary ? '#fff' : danger ? '#dc2626' : base;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    className={`${small ? 'min-h-11 px-3' : 'min-h-12 px-4'} flex-row items-center justify-center gap-2 rounded-xl active:opacity-70 ${grow ? 'flex-1' : ''} ${disabled ? 'opacity-50' : ''}
      ${primary ? 'bg-indigo-600' : danger ? 'border border-red-300 bg-white dark:border-red-900 dark:bg-gray-800' : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
    {icon && <Feather accessible={false} name={icon} size={18} color={color} />}
    <Text className={`shrink text-center text-base font-semibold ${primary ? 'text-white' : danger ? 'text-red-600 dark:text-red-400' : text}`}>{label}</Text>
  </Pressable>;
}

const toDate = (value: string) => parseISO(value);
const toValue = (date: Date) => format(date, 'yyyy-MM-dd');

/** A day shown in words; the system calendar picks it. Empty means "any". */
export function DateButton({ label, value, onChange, min, max }: { label: string; value: string; onChange(value: string): void; min?: string; max?: string }) {
  const [open, setOpen] = useState(false);
  const pick = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: value ? toDate(value) : new Date(), mode: 'date', minimumDate: min ? toDate(min) : undefined,
        maximumDate: max ? toDate(max) : undefined, onChange: (event, date) => { if (event.type === 'set' && date) onChange(toValue(date)); } });
    } else setOpen((o) => !o);
  };
  return <View className="flex-1 gap-1">
    <Text className={`text-sm font-medium ${text}`}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? format(toDate(value), 'MMMM d, yyyy') : 'any day'}. Change date`} onPress={pick}
      className="min-h-12 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800">
      <Text className={`text-base ${value ? text : muted}`}>{value ? format(toDate(value), 'MMM d, yyyy') : 'Any day'}</Text>
      <Text className="font-semibold text-indigo-600 dark:text-indigo-400">{open ? 'Done' : 'Change'}</Text>
    </Pressable>
    {open && Platform.OS === 'ios' && <DateTimePicker value={value ? toDate(value) : new Date()} mode="date" display="inline"
      minimumDate={min ? toDate(min) : undefined} maximumDate={max ? toDate(max) : undefined}
      style={{ height: 340, alignSelf: 'stretch' }} onChange={(_, date) => { if (date) onChange(toValue(date)); }} />}
    {value ? <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChange('')} className="min-h-11 justify-center">
      <Text className="font-semibold text-indigo-600 dark:text-indigo-400">Clear</Text></Pressable> : null}
  </View>;
}
