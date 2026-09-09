import { Input } from '@/components/ui/input';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
}

// Native month input: month + year only, no popover/focus conflicts.
// Stored value stays YYYY-MM-DD (day pinned to 01) so callers/domain are unchanged.
export const DatePicker = ({ value, onChange }: DatePickerProps) => {
  return (
    <Input
      type="month"
      value={value.slice(0, 7)}
      onChange={(e) => onChange(e.target.value ? `${e.target.value}-01` : '')}
      className="w-full [color-scheme:light] dark:[color-scheme:dark]"
    />
  );
};
