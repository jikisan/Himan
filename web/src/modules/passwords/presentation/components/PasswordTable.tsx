import { useState } from 'react';
import { Star, Copy, ExternalLink, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Password as PasswordEntity } from '../../domain/entities/Password';
import type { PasswordType } from '../../domain';
import { Button } from '@/components/ui/button';

interface PasswordTableProps {
  passwords: PasswordType[];
  onEdit: (password: PasswordType) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

type SortField = 'title' | 'username' | 'url' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export const PasswordTable = ({
  passwords,
  onEdit,
  onToggleFavorite,
  onDelete,
}: PasswordTableProps) => {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPasswords = [...passwords].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'username':
        aValue = (a.username || '').toLowerCase();
        bValue = (b.username || '').toLowerCase();
        break;
      case 'url':
        aValue = (a.url || '').toLowerCase();
        bValue = (b.url || '').toLowerCase();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="bg-muted sticky top-0 z-10">
          <tr className="border-b border-border">
            <th className="text-left p-3 text-sm font-medium w-8"></th>
            <th
              className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-accent"
              onClick={() => handleSort('title')}
            >
              Title <SortIcon field="title" />
            </th>
            <th
              className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-accent"
              onClick={() => handleSort('username')}
            >
              Username <SortIcon field="username" />
            </th>
            <th
              className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-accent"
              onClick={() => handleSort('url')}
            >
              Website <SortIcon field="url" />
            </th>
            <th
              className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-accent"
              onClick={() => handleSort('updatedAt')}
            >
              Last Updated <SortIcon field="updatedAt" />
            </th>
            <th className="text-right p-3 text-sm font-medium w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPasswords.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center p-8 text-muted-foreground">
                No passwords found
              </td>
            </tr>
          ) : (
            sortedPasswords.map((password) => {
              const passwordEntity = new PasswordEntity(password);
              const displayUrl = passwordEntity.getDisplayUrl();

              return (
                <tr
                  key={password.id}
                  className="border-b border-border hover:bg-accent/50 transition-colors"
                >
                  <td className="p-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onToggleFavorite(password.id)}
                      className="h-8 w-8"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          password.isFavorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  </td>
                  <td className="p-3">
                    <span className="font-medium">{password.title}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {password.username || '-'}
                      </span>
                      {password.username && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(password.username!, 'Username')}
                          className="h-6 w-6"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {displayUrl || '-'}
                      </span>
                      {password.url && passwordEntity.isValidUrl() && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(password.url!, '_blank')}
                          className="h-6 w-6"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {passwordEntity.getRelativeTime()}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(password.password, 'Password')}
                        className="h-8 w-8"
                        title="Copy password"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(password)}
                        className="h-8 w-8"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(password.id)}
                        className="h-8 w-8 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
