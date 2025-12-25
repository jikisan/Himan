# Notes Module

A Mac Notes-like application built with React, TypeScript, and Supabase following Clean Architecture principles.

## Features

- **Three-panel layout**: Folders, Notes list, and Rich text editor
- **Folder management**: Create, rename, delete folders with note counts
- **Rich text editing**: Using Tiptap with formatting toolbar
- **Auto-save**: Debounced auto-save (1 second delay)
- **Search**: Search notes by title and content
- **Pin notes**: Pin important notes to the top
- **Tags**: Add tags to organize notes
- **Responsive design**: Works on desktop and mobile
- **Dark mode ready**: Uses Tailwind dark mode classes

## Setup Instructions

### 1. Install Dependencies

```bash
cd web
npm install @supabase/supabase-js @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-typography @tiptap/extension-highlight @tiptap/extension-task-list @tiptap/extension-task-item date-fns lucide-react clsx tailwind-merge
```

### 2. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key

#### Run the Migration

Execute the SQL migration file located at:
`web/src/modules/notes/infrastructure/migrations/001_create_notes_tables.sql`

You can run this in the Supabase SQL Editor:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire migration file
4. Run the query

This will create:
- `folders` table with RLS policies
- `notes` table with RLS policies
- Indexes for performance
- Auto-update triggers for `updated_at` fields
- `folders_with_count` view

### 3. Configure Environment Variables

Create a `.env` file in the `web` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Install Tailwind CSS (if not already installed)

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

Add to your main CSS file (`src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Install the typography plugin:

```bash
npm install -D @tailwindcss/typography
```

### 5. Set Up Authentication

The Notes module requires a user ID to work. You need to integrate it with your authentication system.

Update `NotesPage.tsx` (line 8) to use actual user ID from your auth context:

```typescript
// Replace this:
const MOCK_USER_ID = 'user-123';

// With something like:
const { user } = useAuth(); // Your auth hook
const userId = user?.id;
```

### 6. Add Route to Your App

In your main app router (e.g., `src/App.tsx` or router configuration):

```typescript
import { NotesPage } from '@modules/notes';

// In your routes:
<Route path="/notes" element={<NotesPage />} />
```

## Module Structure

```
notes/
├── domain/
│   ├── entities/         # Business entities (Note, Folder)
│   ├── types/            # TypeScript interfaces and DTOs
│   └── usecases/         # Business logic (if needed)
├── infrastructure/
│   ├── api/              # Supabase repositories
│   └── migrations/       # Database migrations
├── presentation/
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   └── pages/            # Page components
└── index.ts              # Public API
```

## Architecture

This module follows **Clean Architecture** principles:

1. **Domain Layer**: Pure business logic, no framework dependencies
2. **Infrastructure Layer**: External services (Supabase), implements domain interfaces
3. **Presentation Layer**: React components, hooks, UI logic

### Dependencies Flow

```
Presentation → Infrastructure → Domain
```

- Presentation can import from Infrastructure and Domain
- Infrastructure can import from Domain only
- Domain has no dependencies

## Usage

### Basic Usage

```typescript
import { NotesPage } from '@modules/notes';

function App() {
  return <NotesPage />;
}
```

### Using Hooks Directly

```typescript
import { useNotes, useFolders } from '@modules/notes/presentation/hooks';

function MyComponent() {
  const { notes, createNote, updateNote, deleteNote } = useNotes(userId);
  const { folders, createFolder } = useFolders(userId);

  // Your component logic
}
```

## Customization

### Styling

The components use Tailwind CSS classes. You can customize:
- Colors: Update classes like `bg-blue-600`, `text-gray-900`, etc.
- Spacing: Modify padding/margin classes (`p-4`, `m-2`, etc.)
- Fonts: Change font classes (`text-lg`, `font-semibold`, etc.)

### Editor Extensions

Add more Tiptap extensions in `RichTextEditor.tsx`:

```typescript
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

const editor = useEditor({
  extensions: [
    StarterKit,
    Link,
    Image,
    // ... other extensions
  ],
});
```

### Auto-save Delay

Change the debounce timeout in `NoteEditor.tsx` (line 45):

```typescript
// Change from 1000ms (1 second) to desired delay
setTimeout(() => {
  // ...
}, 1000); // Change this value
```

## Troubleshooting

### "Missing Supabase environment variables" Error

Make sure `.env` file is in the `web` directory with correct values:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### RLS Policies Not Working

1. Make sure you're authenticated with Supabase
2. Check that `auth.uid()` returns the correct user ID
3. Verify RLS is enabled on both tables

### Notes Not Loading

1. Check browser console for errors
2. Verify Supabase tables exist (run migration)
3. Ensure user ID is being passed correctly
4. Check Supabase dashboard for any API errors

### Styling Issues

1. Ensure Tailwind CSS is configured correctly
2. Check that `@tailwind` directives are in your CSS
3. Verify `tailwind.config.js` content paths include the notes module

## Performance Optimization

- Uses optimistic updates for better UX
- Debounced auto-save prevents excessive API calls
- Proper indexing on Supabase tables
- Memoized callbacks to prevent unnecessary re-renders

## Security

- Row Level Security (RLS) ensures users can only access their own data
- All database operations are filtered by user_id
- No direct SQL queries in frontend code
- Uses Supabase client-side auth

## Future Enhancements

- [ ] Offline support with local storage
- [ ] Real-time collaboration
- [ ] File attachments
- [ ] Export to PDF/Markdown
- [ ] Advanced search with filters
- [ ] Keyboard shortcuts
- [ ] Folder colors and icons
- [ ] Dark mode toggle
- [ ] Mobile app version

## Contributing

When adding new features:
1. Follow Clean Architecture principles
2. Add types for all new entities/DTOs
3. Implement repository pattern for data access
4. Use custom hooks for component logic
5. Follow existing component patterns
6. Add proper error handling

## License

This module is part of the Himan project.
