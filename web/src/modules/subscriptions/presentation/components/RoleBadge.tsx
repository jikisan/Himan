import { cn } from '@core/presentation/utils';
import type { RoleType } from '../../domain';
import { ROLE_NAMES } from '../../domain';
import { Shield, User } from 'lucide-react';

interface RoleBadgeProps {
  role: RoleType;
  className?: string;
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => {
  const getBadgeStyles = () => {
    switch (role) {
      case 'user':
        return 'bg-muted text-muted-foreground border-border';
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
    }
  };

  const getIcon = () => {
    switch (role) {
      case 'user':
        return <User className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getBadgeStyles(),
        className
      )}
    >
      {getIcon()}
      {ROLE_NAMES[role]}
    </span>
  );
};
