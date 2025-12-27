import type { PasswordType } from '../../domain';
import { PasswordCard } from './PasswordCard';

interface PasswordGridProps {
  passwords: PasswordType[];
  onEdit: (password: PasswordType) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const PasswordGrid = ({
  passwords,
  onEdit,
  onDelete,
  onToggleFavorite,
}: PasswordGridProps) => {
  if (passwords.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No passwords found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {passwords.map((password) => (
          <PasswordCard
            key={password.id}
            password={password}
            onEdit={() => onEdit(password)}
            onDelete={() => onDelete(password.id)}
            onToggleFavorite={() => onToggleFavorite(password.id)}
          />
        ))}
      </div>
    </div>
  );
};
