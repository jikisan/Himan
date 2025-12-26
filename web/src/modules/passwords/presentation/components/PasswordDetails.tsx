import { useState } from 'react';
import { MoreVertical, Star, Trash2, Eye, EyeOff, Copy, ExternalLink, Edit2, Save, X } from 'lucide-react';
import type { Password as PasswordEntity } from '../../domain/entities/Password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PasswordDetailsProps {
  password: PasswordEntity;
  onUpdate: (data: {
    title?: string;
    username?: string | null;
    password?: string;
    url?: string | null;
    notes?: string | null;
  }) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

export const PasswordDetails = ({
  password,
  onUpdate,
  onToggleFavorite,
  onDelete,
}: PasswordDetailsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editData, setEditData] = useState({
    title: password.title,
    username: password.username || '',
    password: password.password,
    url: password.url || '',
    notes: password.notes || '',
  });

  const handleSave = () => {
    onUpdate({
      title: editData.title,
      username: editData.username || null,
      password: editData.password,
      url: editData.url || null,
      notes: editData.notes || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: password.title,
      username: password.username || '',
      password: password.password,
      url: password.url || '',
      notes: password.notes || '',
    });
    setIsEditing(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        {isEditing ? (
          <Input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
            placeholder="Title"
          />
        ) : (
          <h1 className="text-2xl font-bold">{password.title}</h1>
        )}

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleFavorite}>
                  <Star className="h-4 w-4 mr-2" />
                  {password.isFavorite ? 'Remove from' : 'Add to'} Favorites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Username */}
        <div className="space-y-2">
          <Label>Username</Label>
          {isEditing ? (
            <Input
              value={editData.username}
              onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              placeholder="Enter username"
            />
          ) : (
            <div className="flex items-center gap-2">
              <Input value={password.username || ''} readOnly className="flex-1" />
              {password.username && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(password.username!, 'Username')}
                  className="h-10 w-10"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label>Password</Label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                placeholder="Enter password"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                className="h-10 w-10"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password.password}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                className="h-10 w-10"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(password.password, 'Password')}
                className="h-10 w-10"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* URL */}
        <div className="space-y-2">
          <Label>Website URL</Label>
          {isEditing ? (
            <Input
              value={editData.url}
              onChange={(e) => setEditData({ ...editData, url: e.target.value })}
              placeholder="https://example.com"
            />
          ) : (
            <div className="flex items-center gap-2">
              <Input value={password.url || ''} readOnly className="flex-1" />
              {password.url && password.isValidUrl() && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => window.open(password.url!, '_blank')}
                  className="h-10 w-10"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          {isEditing ? (
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Add notes..."
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="p-3 rounded-md border border-input bg-muted min-h-[100px] text-sm whitespace-pre-wrap">
              {password.notes || 'No notes'}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
        Last updated {password.getRelativeTime()}
      </div>
    </div>
  );
};
