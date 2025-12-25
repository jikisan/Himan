# Notes Feature Setup Guide

This guide will help you complete the setup of the Notes module for the Himan project.

## What's Been Done

✅ Domain layer (entities, types, repositories)
✅ Infrastructure layer (Supabase repositories)
✅ Presentation layer (components, hooks, pages)
✅ Database migration SQL
✅ Path aliases configuration
✅ Supabase client setup

## What You Need to Do

### Step 1: Install Dependencies

Due to npm cache permission issues, you need to manually install the required dependencies:

```bash
cd web

# Install all required packages
npm install @supabase/supabase-js \
  @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-placeholder \
  @tiptap/extension-typography \
  @tiptap/extension-highlight \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  lucide-react \
  clsx \
  tailwind-merge

# Install Tailwind CSS if not already installed
npm install -D tailwindcss postcss autoprefixer @tailwindcss/typography

# Initialize Tailwind (if not done)
npx tailwindcss init -p
```

### Step 2: Configure Tailwind CSS

Update `web/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

Update `web/src/index.css` to include Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Your existing styles */
```

### Step 3: Set Up Supabase

#### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready
4. Note your **Project URL** and **Anon Key** from Settings > API

#### 3.2 Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `web/src/modules/notes/infrastructure/migrations/001_create_notes_tables.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

This creates:
- `folders` and `notes` tables
- Indexes for performance
- Row-level security policies
- Auto-update triggers

#### 3.3 Configure Environment Variables

Create `web/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Supabase dashboard.

### Step 4: Set Up Authentication

The Notes module requires a user ID. You have two options:

#### Option A: Use Mock User (for testing)

The current implementation uses a mock user ID. To test:

1. Go to Supabase dashboard > Authentication > Users
2. Create a test user
3. Copy the user's UUID
4. Update `web/src/modules/notes/presentation/pages/NotesPage.tsx` line 8:

```typescript
const MOCK_USER_ID = 'paste-user-uuid-here';
```

#### Option B: Integrate with Real Auth (recommended)

1. Implement authentication in the `@auth` module
2. Create an auth context/hook that provides current user
3. Update `NotesPage.tsx`:

```typescript
import { useAuth } from '@auth'; // Your auth hook

export const NotesPage = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Pass userId to hooks instead of MOCK_USER_ID
  const { folders, ... } = useFolders(userId);
  const { notes, ... } = useNotes(userId, notesFilterFolderId);

  // Rest of component
}
```

### Step 5: Add Route to App

Update your main app file (e.g., `web/src/App.tsx`):

```typescript
import { NotesPage } from '@notes';

function App() {
  return (
    <div className="App">
      <NotesPage />
    </div>
  );
}

export default App;
```

Or if using React Router:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotesPage } from '@notes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/notes" element={<NotesPage />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 6: Test the Application

```bash
cd web
npm run dev
```

Visit `http://localhost:5173` (or your configured port)

You should see:
- Left panel: Folder list with "All Notes"
- Middle panel: Notes list with search
- Right panel: "Select a note to view"

## Troubleshooting

### "Missing Supabase environment variables"

- Check `.env` file exists in `web/` directory
- Verify variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding `.env`

### "Cannot find module '@tiptap/react'"

- Run the install command from Step 1 again
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`

### Import errors with path aliases

- Restart your IDE/editor
- Restart the dev server
- Check that `tsconfig.app.json` and `vite.config.ts` have matching aliases

### No data showing / RLS errors

- Ensure migration was run successfully in Supabase
- Check RLS policies are enabled (should be automatic from migration)
- Verify user ID is correct
- Check browser console for errors

### Styles not working

- Ensure Tailwind CSS is installed and configured
- Check `@tailwind` directives are in `index.css`
- Verify `tailwind.config.js` content paths are correct

## Next Steps

1. **Implement Authentication**: Replace mock user ID with real auth
2. **Add Dark Mode**: Implement theme switching
3. **Mobile Responsiveness**: Test and adjust for mobile devices
4. **Error Handling**: Add toast notifications for errors
5. **Performance**: Add loading skeletons and optimize queries
6. **Features**: Add more features from the Future Enhancements list

## File Structure

```
web/
├── src/
│   └── modules/
│       └── notes/
│           ├── domain/
│           │   ├── entities/
│           │   │   ├── Folder.ts
│           │   │   ├── Note.ts
│           │   │   └── index.ts
│           │   ├── types/
│           │   │   └── index.ts
│           │   └── usecases/
│           │       └── index.ts
│           ├── infrastructure/
│           │   ├── api/
│           │   │   ├── SupabaseFolderRepository.ts
│           │   │   ├── SupabaseNoteRepository.ts
│           │   │   └── index.ts
│           │   └── migrations/
│           │       └── 001_create_notes_tables.sql
│           ├── presentation/
│           │   ├── components/
│           │   │   ├── FolderList.tsx
│           │   │   ├── NotesList.tsx
│           │   │   ├── RichTextEditor.tsx
│           │   │   ├── NoteEditor.tsx
│           │   │   └── index.ts
│           │   ├── hooks/
│           │   │   ├── useFolders.ts
│           │   │   ├── useNotes.ts
│           │   │   └── index.ts
│           │   └── pages/
│           │       ├── NotesPage.tsx
│           │       └── index.ts
│           ├── index.ts
│           └── README.md
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Tiptap Documentation](https://tiptap.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- Module README: `web/src/modules/notes/README.md`

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the module README
3. Check browser console for errors
4. Check Supabase dashboard for API errors
5. Verify all dependencies are installed

Happy coding! 🚀
