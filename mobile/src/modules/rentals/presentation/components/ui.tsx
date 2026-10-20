import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';

// Rentals is used by older, non-technical landlords: every action is a labelled button (an icon may sit beside it), 48pt tall.

export type IconName = React.ComponentProps<typeof Feather>['name'];
export const text = 'text-gray-900 dark:text-white';
export const muted = 'text-gray-500 dark:text-gray-400';
export const card = 'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800';
export const inputClass = 'min-h-12 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white';

export function useIconColor() {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? '#e5e7eb' : '#111827';
}

type Variant = 'primary' | 'outline' | 'danger' | 'ghost' | 'dangerOutline';
const VARIANT: Record<Variant, { box: string; label: string; icon: string; iconDark: string }> = {
  primary: { box: 'bg-indigo-600', label: 'text-white', icon: '#ffffff', iconDark: '#ffffff' },
  outline: { box: 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800', label: text, icon: '#111827', iconDark: '#e5e7eb' },
  danger: { box: 'bg-red-600', label: 'text-white', icon: '#ffffff', iconDark: '#ffffff' },
  dangerOutline: { box: 'border border-red-300 bg-white dark:border-red-800 dark:bg-gray-800', label: 'text-red-600 dark:text-red-400', icon: '#dc2626', iconDark: '#f87171' },
  ghost: { box: '', label: text, icon: '#111827', iconDark: '#e5e7eb' },
};

/** A labelled button. `label` is what it says; `a11y` adds who/what it acts on for screen readers. */
export function Btn({ label, icon, onPress, variant = 'outline', disabled, busy, a11y, grow, small }: {
  label: string; icon?: IconName; onPress(): void; variant?: Variant; disabled?: boolean; busy?: boolean; a11y?: string; grow?: boolean; small?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const v = VARIANT[variant];
  const off = disabled || busy;
  return <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{ disabled: !!off, busy: !!busy }} disabled={off}
    onPress={onPress} className={`${small ? 'min-h-11 px-3' : 'min-h-12 px-4'} flex-row items-center justify-center gap-2 rounded-xl active:opacity-70 ${v.box}
      ${grow ? 'flex-1' : ''} ${off ? 'opacity-50' : ''}`}>
    {busy ? <ActivityIndicator size="small" color={colorScheme === 'dark' ? v.iconDark : v.icon} />
      : icon && <Feather accessible={false} name={icon} size={18} color={colorScheme === 'dark' ? v.iconDark : v.icon} />}
    <Text className={`text-base font-semibold ${v.label}`}>{label}</Text>
  </Pressable>;
}

export function Row({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <View className={`flex-row gap-2 ${wrap ? 'flex-wrap' : ''}`}>{children}</View>;
}

const TONE = {
  primary: 'bg-indigo-100 dark:bg-indigo-900/50', primaryText: 'text-indigo-700 dark:text-indigo-300',
  amber: 'bg-amber-100 dark:bg-amber-900/40', amberText: 'text-amber-800 dark:text-amber-300',
  red: 'bg-red-100 dark:bg-red-900/40', redText: 'text-red-700 dark:text-red-300',
  green: 'bg-emerald-100 dark:bg-emerald-900/40', greenText: 'text-emerald-700 dark:text-emerald-300',
  gray: 'bg-gray-100 dark:bg-gray-700', grayText: 'text-gray-600 dark:text-gray-300',
} as const;
export type Tone = 'primary' | 'amber' | 'red' | 'green' | 'gray';
export const TONE_ICON: Record<Tone, string> = { primary: '#4f46e5', amber: '#b45309', red: '#dc2626', green: '#059669', gray: '#6b7280' };

export function Badge({ label, tone = 'gray' }: { label: string; tone?: Tone }) {
  return <View className={`self-start rounded-full px-2.5 py-0.5 ${TONE[tone]}`}><Text className={`text-xs font-semibold ${TONE[`${tone}Text`]}`}>{label}</Text></View>;
}

export function IconTile({ icon, tone }: { icon: IconName; tone: Tone }) {
  return <View className={`h-11 w-11 items-center justify-center rounded-xl ${TONE[tone]}`}><Feather accessible={false} name={icon} size={20} color={TONE_ICON[tone]} /></View>;
}

export function Initials({ name }: { name: string }) {
  const letters = name.split('@')[0].split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <View accessible={false} className="h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
    <Text className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{letters || '?'}</Text></View>;
}

export function Title({ children, size = 'lg' }: { children: ReactNode; size?: 'base' | 'lg' | 'xl' }) {
  return <Text accessibilityRole="header" className={`font-semibold ${size === 'xl' ? 'text-2xl font-bold' : size === 'lg' ? 'text-lg' : 'text-base'} ${text}`}>{children}</Text>;
}

export function Empty({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return <View className="items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-6 py-10 dark:border-gray-600">
    <Feather name={icon} size={32} color="#9ca3af" />
    <Text className={`text-center text-base font-semibold ${text}`}>{title}</Text>
    {children ? <Text className={`text-center ${muted}`}>{children}</Text> : null}
    {action ? <View className="mt-3">{action}</View> : null}
  </View>;
}

/** Label (with `*` when required), optional hint, the control, then the error right under it. */
export function Field({ label, hint, required, error, children }: { label: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
  return <View className="gap-1.5">
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
      <Text className={`text-sm font-semibold ${text}`}>{label}{required ? <Text className="text-red-600"> *</Text> : null}</Text>
      {hint ? <Text className={`text-xs ${muted}`}>{hint}</Text> : null}
    </View>
    {children}
    {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
  </View>;
}

export function Input({ invalid, className, ...props }: TextInputProps & { invalid?: boolean; className?: string }) {
  return <TextInput placeholderTextColor="#9ca3af" autoCorrect={false} {...props}
    className={`${inputClass} ${invalid ? 'border-red-500 dark:border-red-500' : ''} ${props.editable === false ? 'opacity-60' : ''} ${className ?? ''}`} />;
}

export function MoneyInput({ invalid, ...props }: TextInputProps & { invalid?: boolean }) {
  return <View className="justify-center">
    <Text className={`absolute left-4 z-10 text-base ${muted}`}>₱</Text>
    <Input keyboardType="decimal-pad" invalid={invalid} {...props} className="pl-8" />
  </View>;
}

/** yyyy-MM-dd ↔ a local Date at noon, so time zones never shift the day. */
const toDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const toValue = (date: Date) => format(date, 'yyyy-MM-dd');

/** A date shown in words with a "Change" button; the system calendar picks it. */
export function DateField({ value, onChange, label, min, max, disabled }: {
  value: string; onChange(value: string): void; label: string; min?: string; max?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pick = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: value ? toDate(value) : new Date(), mode: 'date', minimumDate: min ? toDate(min) : undefined,
        maximumDate: max ? toDate(max) : undefined, onChange: (event, date) => { if (event.type === 'set' && date) onChange(toValue(date)); } });
    } else setOpen((o) => !o);
  };
  return <View className="gap-2">
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? format(parseISO(value), 'MMMM d, yyyy') : 'not set'}. Change date`}
      disabled={disabled} onPress={pick} className={`${inputClass} flex-row items-center justify-between ${disabled ? 'opacity-60' : ''}`}>
      <Text className={`text-base ${value ? text : muted}`}>{value ? format(parseISO(value), 'MMM d, yyyy') : 'Pick a date'}</Text>
      <View className="flex-row items-center gap-1"><Feather name="calendar" size={16} color="#4f46e5" />
        <Text className="font-semibold text-indigo-600 dark:text-indigo-400">{open ? 'Done' : 'Change'}</Text></View>
    </Pressable>
    {open && Platform.OS === 'ios' && <DateTimePicker value={value ? toDate(value) : new Date()} mode="date" display="inline"
      minimumDate={min ? toDate(min) : undefined} maximumDate={max ? toDate(max) : undefined}
      onChange={(_, date) => { if (date) onChange(toValue(date)); }} />}
  </View>;
}

/** One-of choice as big pills (replaces web selects and radio groups). */
export function Choice<T extends string>({ value, options, onChange, label, disabled }: {
  value: T; options: readonly (readonly [NoInfer<T>, string])[]; onChange(value: NoInfer<T>): void; label: string; disabled?: boolean;
}) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
    {options.map(([v, words]) => {
      const on = v === value;
      return <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={() => onChange(v)}
        className={`min-h-12 justify-center rounded-xl px-4 py-2 active:opacity-70 ${on ? 'bg-indigo-600' : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
        <Text className={`text-base ${on ? 'font-semibold text-white' : text}`}>{words}</Text>
      </Pressable>;
    })}
  </View>;
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange(value: boolean): void; label: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => onChange(!checked)}
    className="min-h-12 flex-row items-center gap-3 active:opacity-70">
    <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'}`}>
      {checked && <Feather name="check" size={16} color="#fff" />}</View>
    <Text className={`flex-1 text-base ${text}`}>{label}</Text>
  </Pressable>;
}

export function Banner({ message, tone = 'red' }: { message?: string | null; tone?: 'red' | 'amber' | 'gray' }) {
  if (!message) return null;
  const box = tone === 'red' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40' : tone === 'amber'
    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800';
  const words = tone === 'red' ? 'text-red-700 dark:text-red-300' : tone === 'amber' ? 'text-amber-800 dark:text-amber-200' : text;
  return <View accessibilityRole={tone === 'red' ? 'alert' : undefined} className={`rounded-xl border p-3 ${box}`}><Text className={words}>{message}</Text></View>;
}

/** Facts as label/value lines. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <View className="gap-1.5">{rows.map(([k, v]) => <View key={k} className="flex-row justify-between gap-3">
    <Text className={muted}>{k}</Text><Text className={`flex-1 text-right font-semibold ${text}`}>{v}</Text></View>)}</View>;
}

/** Errors under each field (by id) plus one banner for refusals not tied to a field. Same shape as web's useFieldErrors. */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  return {
    errors, formError, setFormError,
    fail: (id: string, message: string) => setErrors((e) => ({ ...e, [id]: message })),
    failMany: (list: [string, string][]) => setErrors(Object.fromEntries(list.filter(([id], i) => list.findIndex(([x]) => x === id) === i))),
    clear: (id?: string) => {
      if (id === undefined) { setErrors({}); setFormError(null); } else setErrors((e) => { if (!(id in e)) return e; const { [id]: _, ...rest } = e; return rest; });
    },
  };
}
export type FieldErrors = ReturnType<typeof useFieldErrors>;

/** A zod error as [field id, message] pairs; `id` maps an issue path to a field id (null = no field). */
export function zodFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }, id: (path: PropertyKey[]) => string | null): [string, string][] {
  return error.issues.flatMap((i): [string, string][] => { const f = id(i.path); return f ? [[f, i.message]] : []; });
}

type Toast = { show(message: string, type?: 'success' | 'error' | 'warning'): void; view: ReactNode };
export const ToastContext = createContext<Toast>({ show: () => undefined, view: null });
export const useRentalToast = () => useContext(ToastContext).show;

/**
 * A full-screen sheet with a title, a labelled Close button and an optional sticky footer. Shows the rentals toast on top of itself
 * (a native modal covers the screen's own toast).
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, closeLabel = 'Close', scroll = true, overlay }: {
  open: boolean; onClose(): void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; closeLabel?: string; scroll?: boolean;
  /** Sheets opened from this one; rendered inside it so they stack on top. */
  overlay?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const icon = useIconColor();
  const toast = useContext(ToastContext);
  return <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <View className="flex-1"><Title>{title}</Title>{subtitle ? <Text className={`text-sm ${muted}`}>{subtitle}</Text> : null}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}
          className="min-h-11 flex-row items-center gap-1 rounded-xl px-3 active:bg-gray-200 dark:active:bg-gray-800">
          <Feather name="x" size={20} color={icon} /><Text className={`font-semibold ${text}`}>{closeLabel}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: footer ? 16 : Math.max(insets.bottom, 24) }}>
          {children}</ScrollView> : <View className="flex-1">{children}</View>}
        {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="gap-2 border-t border-gray-200 bg-white px-4 pt-3 dark:border-gray-800 dark:bg-gray-900">{footer}</View> : null}
      </KeyboardAvoidingView>
      {toast.view}
    </SafeAreaView>
    {overlay}
  </Modal>;
}
