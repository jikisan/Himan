# Detailed Prompt for Notes Feature Implementation

## Project Context
I have a React + Vite + TypeScript web application with a modular Clean Architecture structure. The project uses:
- **Styling**: Tailwind CSS and shadcn/ui components
- **Database**: Supabase
- **State Management**: React hooks with custom repository pattern
- **Architecture**: Domain-driven design with separate domain, infrastructure, and presentation layers

## Current Project Structure
```
web/src/modules/
├── auth/
├── dashboard/
├── shared/ (@core)
│   ├── domain/
│   ├── infrastructure/
│   └── presentation/
│       └── components/
│           └── ui/ (shadcn components)
```

## Feature Requirements
Build a Mac Notes-like application with the following specifications:

### Core Features
1. **Three-panel layout**:
   - Left panel: Folder list
   - Middle panel: Notes list
   - Right panel: Note editor

2. **Folder Management**:
   - Simple two-level hierarchy (Folders → Notes)
   - Create, rename, delete folders
   - Show note count per folder
   - "All Notes" default view
   - Optional folder colors

3. **Notes Management**:
   - Create, edit, delete notes
   - Auto-save with debouncing
   - Show note preview/excerpt in list
   - Display relative timestamps (e.g., "2 hours ago")
   - Search within current folder

4. **Rich Text Editor**:
   - Basic formatting: Bold, Italic, Underline, Strikethrough
   - Bullet points and numbered lists
   - Heading levels (H1, H2, H3)
   - Use Tiptap or Lexical for the editor
   - Toolbar with formatting buttons
   - Keyboard shortcuts (Cmd/Ctrl+B for bold, etc.)

### Technical Implementation

#### 1. Create Module Structure
Create a new `notes` module at `web/src/modules/notes/` with:
- Domain layer (entities, types, use cases)
- Infrastructure layer (Supabase repositories)
- Presentation layer (components, hooks, pages)

#### 2. Supabase Schema
Create tables with RLS policies:
- `folders` table: id, name, color, icon, user_id, timestamps
- `notes` table: id, title, content (HTML), excerpt, folder_id, user_id, is_pinned, tags[], timestamps
- Proper indexes and foreign key relationships
- Row-level security for user data isolation

#### 3. Component Architecture
- Use shadcn/ui components (Button, DropdownMenu, Dialog, Input, ScrollArea)
- Implement with Tailwind classes following shadcn design system
- Create reusable components for folder items, note items, toolbar
- Use lucide-react icons consistently

#### 4. State Management
- Custom hooks: `useNotes()`, `useFolders()`, `useEditor()`
- Repository pattern for data access
- Optimistic updates for better UX
- Error handling with toast notifications

#### 5. Editor Implementation
Use Tiptap with these extensions:
```javascript
- StarterKit
- Placeholder
- Typography
- Highlight
- TaskList
- TaskItem
```

#### 6. UI/UX Requirements
- Responsive design (mobile-friendly)
- Loading states with skeletons
- Empty states with helpful messages
- Smooth transitions and animations
- Dark mode support (using Tailwind dark: classes)
- Keyboard navigation support

### File Creation Order
1. **Domain Layer** (`/domain/entities/`, `/domain/types/`)
2. **Database Schema** (SQL migration file)
3. **Infrastructure Layer** (`/infrastructure/api/`)
4. **Custom Hooks** (`/presentation/hooks/`)
5. **UI Components** (`/presentation/components/`)
6. **Main Page** (`/presentation/pages/NotesPage.tsx`)
7. **Router Integration** (add route to main app router)

### Styling Guidelines
- Follow shadcn/ui design patterns
- Use consistent spacing (p-2, p-4, p-6)
- Maintain color scheme: gray for neutral, blue for primary actions
- Use hover states and transitions
- Implement focus-visible for accessibility

### Code Quality Requirements
- TypeScript strict mode
- Proper error boundaries
- Loading and error states for all async operations
- Memoization where appropriate
- Accessibility (ARIA labels, keyboard navigation)
- Mobile-responsive design

### Example Component Pattern
```tsx
// Use this pattern for all components
import { cn } from '@core/presentation/utils';
import { ComponentProps } from 'react';

interface Props extends ComponentProps<'div'> {
  // specific props
}

export const Component = ({ className, ...props }: Props) => {
  return (
    <div className={cn("base-classes", className)} {...props}>
      {/* content */}
    </div>
  );
};
```

### Example Tailwind Classes to Use
```css
/* Layout */
"flex h-screen bg-gray-50"
"w-64 bg-gray-100 border-r border-gray-200"
"flex-1 overflow-y-auto"

/* Interactive Elements */
"hover:bg-gray-200 transition-colors cursor-pointer"
"bg-blue-600 hover:bg-blue-700 text-white"
"focus:outline-none focus:ring-2 focus:ring-blue-500"

/* Text */
"text-lg font-semibold text-gray-900"
"text-sm text-gray-500"
"text-xs text-gray-400"

/* Spacing */
"p-4" "px-6 py-4" "gap-2" "space-y-1"

/* States */
"opacity-0 group-hover:opacity-100"
"animate-spin" "animate-pulse"
"disabled:opacity-50 disabled:cursor-not-allowed"
```

### Repository Pattern Example
```typescript
export class SupabaseNoteRepository {
  async create(note: CreateNoteDto): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): Note {
    return {
      id: data.id,
      title: data.title,
      // ... mapping logic
    };
  }
}
```

### Hook Pattern Example
```typescript
export const useNotes = (folderId?: string) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const repository = new SupabaseNoteRepository();

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repository.findByFolder(folderId);
      setNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return { notes, loading, error, refetch: loadNotes };
};
```

## Deliverables
Please create:
1. Complete module structure with all files
2. Supabase migration SQL
3. All components with Tailwind + shadcn styling
4. Repository implementations
5. Custom hooks
6. Integration with existing auth system
7. README with setup instructions

Focus on creating production-ready code with proper TypeScript types, error handling, and following React best practices. Use modern React patterns (no class components) and ensure all code is properly formatted and commented where necessary.

## Additional Context
- The project already has a working auth system in the `auth` module
- Supabase client is configured in `@core/infrastructure/config/supabase`
- shadcn/ui components are in `@core/presentation/components/ui/`
- Utility functions like `cn()` are in `@core/presentation/utils/`
- The app uses React Router for navigation
- Environment variables for Supabase are already configured

## Success Criteria
- [ ] Notes app works like Mac Notes with three-panel layout
- [ ] Rich text editing with formatting toolbar
- [ ] Auto-save functionality
- [ ] Folder organization
- [ ] Responsive design
- [ ] Proper TypeScript types
- [ ] Clean Architecture maintained
- [ ] All CRUD operations working
- [ ] RLS policies implemented
- [ ] Loading and error states handled