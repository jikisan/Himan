import { useState } from 'react';
import { Copy, MoreVertical, Edit2, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { Password as PasswordEntity } from '../../domain/entities/Password';
import type { PasswordType } from '../../domain';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PasswordCardProps {
  password: PasswordType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export const PasswordCard = ({
  password,
  onEdit,
  onDelete,
  onToggleFavorite,
}: PasswordCardProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const passwordEntity = new PasswordEntity(password);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow border border-border relative">
      {/* Header with favorite and menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleFavorite}
            className="h-7 w-7 flex-shrink-0"
          >
            <Star
              className={`h-4 w-4 ${
                password.isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </Button>
          <h3 className="font-semibold text-base truncate flex-1">{password.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            style={{
              backgroundColor: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
            }}
          >
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Password fields */}
      <div className="space-y-3">
        {/* Username */}
        {password.username && (
          <div>
            <label className="text-xs text-muted-foreground opacity-50">Username</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm truncate flex-1">{password.username}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(password.username!, 'Username')}
                className="h-7 w-7 flex-shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <label className="text-xs text-muted-foreground opacity-50">Password</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono flex-1 truncate">
              {showPassword ? password.password : '••••••••••••'}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
              className="h-7 w-7 flex-shrink-0"
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(password.password, 'Password')}
              className="h-7 w-7 flex-shrink-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* URL */}
        {password.url && (
          <div>
            <label className="text-xs text-muted-foreground opacity-50">Website</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-blue-500 truncate flex-1">
                {passwordEntity.getDisplayUrl()}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(password.url!, 'URL')}
                className="h-7 w-7 flex-shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
