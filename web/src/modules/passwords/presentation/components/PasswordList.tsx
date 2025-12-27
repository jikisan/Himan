import { Plus, Search } from 'lucide-react';
import type { PasswordType } from '../../domain';
import { Password as PasswordEntity } from '../../domain/entities/Password';
import { PasswordItem } from './PasswordItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PasswordListProps {
  passwords: PasswordType[];
  selectedPasswordId: string | null;
  onSelectPassword: (password: PasswordEntity | null) => void;
  onCreatePassword: () => void;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const PasswordList = ({
  passwords,
  selectedPasswordId,
  onSelectPassword,
  onCreatePassword,
  loading,
  searchQuery,
  onSearchChange,
}: PasswordListProps) => {
  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Passwords</h2>
          <Button size="icon" variant="ghost" onClick={onCreatePassword} className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search passwords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading passwords...
          </div>
        ) : passwords.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No passwords found' : 'No passwords yet'}
          </div>
        ) : (
          passwords.map((password) => (
            <PasswordItem
              key={password.id}
              password={password}
              isActive={selectedPasswordId === password.id}
              onClick={() => onSelectPassword(new PasswordEntity(password))}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
};
