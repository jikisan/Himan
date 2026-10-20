import { useState, useEffect, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PasswordType, CategoryType } from '../../domain';

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password?: PasswordType | null;
  categories: CategoryType[];
  onSave: (data: {
    title: string;
    username: string | null;
    password: string;
    url: string | null;
    notes: string | null;
    categoryId: string | null;
  }) => Promise<void>;
}

export const PasswordDialog = ({
  open,
  onOpenChange,
  password,
  categories,
  onSave,
}: PasswordDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    categoryId: null as string | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const fe = useFieldErrors();
  const clearErrors = fe.clear;

  useEffect(() => {
    if (password) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when editing a different password
      setFormData({
        title: password.title,
        username: password.username || '',
        password: password.password,
        url: password.url || '',
        notes: password.notes || '',
        categoryId: password.categoryId,
      });
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        categoryId: null,
      });
    }
    setShowPassword(false);
    clearErrors();
  }, [password, open, clearErrors]);

  const generatePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let newPassword = '';

    // Use rejection sampling to eliminate modulo bias
    const maxValid = 256 - (256 % charset.length);

    while (newPassword.length < length) {
      const array = new Uint8Array(1);
      crypto.getRandomValues(array);
      const value = array[0];

      // Only use values that don't cause bias
      if (value < maxValid) {
        newPassword += charset[value % charset.length];
      }
    }

    setFormData({ ...formData, password: newPassword });
    fe.clear('password');
    setShowPassword(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const invalid: [string, string][] = [];
    if (!formData.title.trim()) invalid.push(['title', 'Enter a title']);
    if (!formData.password) invalid.push(['password', 'Enter a password']);
    if (invalid.length) { fe.failMany(invalid); return; }
    try {
      await onSave({
      title: formData.title,
      username: formData.username || null,
      password: formData.password,
      url: formData.url || null,
      notes: formData.notes || null,
      categoryId: formData.categoryId,
      });
    } catch (err) {
      fe.setFormError(err instanceof Error ? err.message : 'Could not save this password.');
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{password ? 'Edit Password' : 'Add Password'}</DialogTitle>
          <DialogDescription>
            {password ? 'Update the password information below.' : 'Enter the details for your new password entry.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSave}>
        <div className="space-y-4">
          <FormErrorBanner message={fe.formError} />
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" required>Title</Label>
            <Input
              id="title"
              required
              {...fe.invalid('title')}
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); fe.clear('title'); }}
              placeholder="e.g., Gmail Account"
            />
            <FieldError id="title" message={fe.errors.title} />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username / Email</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" required>Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                required
                {...fe.invalid('password')}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); fe.clear('password'); }}
                placeholder="Enter password"
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="h-10 w-10"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Generate password"
                onClick={generatePassword}
                className="h-10 w-10"
                title="Generate password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <FieldError id="password" message={fe.errors.password} />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value === 'none' ? null : value })
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            {password ? 'Save Changes' : 'Add Password'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
