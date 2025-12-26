import { Star } from 'lucide-react';
import type { PasswordType } from '../../domain';
import { Password } from '../../domain/entities/Password';

interface PasswordItemProps {
  password: PasswordType;
  isActive: boolean;
  onClick: () => void;
}

export const PasswordItem = ({
  password,
  isActive,
  onClick,
}: PasswordItemProps) => {
  const passwordEntity = new Password(password);
  const displayUrl = passwordEntity.getDisplayUrl();

  return (
    <div
      className={
        'p-3 border-b border-border cursor-pointer transition-colors hover:bg-accent ' +
        (isActive ? 'bg-accent' : '')
      }
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{password.title}</h3>
            {password.isFavorite && (
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            )}
          </div>
          {password.username && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {password.username}
            </p>
          )}
          {displayUrl && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {displayUrl}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {passwordEntity.getRelativeTime()}
        </div>
      </div>
    </div>
  );
};
