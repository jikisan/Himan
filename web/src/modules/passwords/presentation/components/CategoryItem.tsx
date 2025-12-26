import { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { CategoryType } from '../../domain';

interface CategoryItemProps {
  category: CategoryType;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const CategoryItem = ({
  category,
  isActive,
  onClick,
  onEdit,
  onDelete,
}: CategoryItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete();
  };

  return (
    <div
      className={
        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors group relative ' +
        (isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground')
      }
      onClick={onClick}
    >
      <Folder className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">{category.name}</span>
      {category.passwordCount !== undefined && (
        <span className="text-xs opacity-70">{category.passwordCount}</span>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={handleMenuClick}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity"
        >
          <MoreVertical className="w-3 h-3" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-32 rounded-md shadow-lg border border-border py-1 z-50 bg-popover text-popover-foreground">
            <button
              onClick={handleEdit}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            >
              <Edit2 className="w-3 h-3" />
              Rename
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-destructive"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
