# Quick Start Guide

## Current Status

✅ Navigation system fully implemented
✅ Notes module fully implemented
⚠️ Missing dependencies need to be installed

## Why You're Not Seeing Changes

The dev server is running but missing required dependencies. You need to install them first.

## Install Dependencies

Run this command in your terminal:

```bash
cd web
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
```

## Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key
3. Create `web/.env`:
   ```env
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. Run the database migration in Supabase SQL Editor:
   - Open file: `web/src/modules/notes/infrastructure/migrations/001_create_notes_tables.sql`
   - Copy all contents
   - Paste and run in Supabase SQL Editor

## Start the App

```bash
cd web
npm run dev
```

Then open: http://localhost:5173

## First Time Setup

1. You'll be redirected to `/login`
2. Click "Don't have an account? Sign up"
3. Create an account with your email
4. You'll be automatically logged in and see the dashboard

## Navigation

- **Sidebar** (left): Navigate between Dashboard, Notes, Profile, Settings
- **Top Bar**: Search, notifications, user menu
- **Mobile**: Tap hamburger menu (☰) to open navigation

## What You'll See

### Dashboard (`/dashboard`)
- Welcome message
- Quick links to Notes, Profile, Settings
- Stats cards (currently showing 0s)

### Notes (`/notes`)
- Three-panel Mac Notes-like interface
- Left: Folders
- Middle: Notes list
- Right: Rich text editor

### Profile (`/profile`)
- Your email and user information

### Settings (`/settings`)
- App settings (placeholder for now)

## Module Organization

```
web/src/modules/
├── auth/          - Login, signup
├── dashboard/     - Main dashboard
├── notes/         - Full notes application
├── settings/      - Profile & settings
└── shared/        - Common components & utilities
```

## Path Aliases

You can import using these aliases:
- `@core/*` → shared module
- `@auth/*` → auth module
- `@dashboard/*` → dashboard module
- `@notes/*` → notes module
- `@settings/*` → settings module
- `@/*` → src directory

## Troubleshooting

### "Missing dependencies" error
→ Run the npm install command above

### "Missing Supabase environment variables"
→ Create `.env` file in `web/` directory with your Supabase credentials

### Blank page / white screen
→ Check browser console (F12) for errors
→ Make sure all dependencies are installed
→ Make sure dev server is running

### Cannot login/signup
→ Make sure Supabase is configured
→ Check .env file has correct values
→ Verify database migration was run

## Next Steps

1. **Install dependencies** (see command above)
2. **Set up Supabase** (see section above)
3. **Start dev server**: `npm run dev`
4. **Create an account** at http://localhost:5173
5. **Start using the app!**

## Features to Try

Once everything is set up:

- ✏️ Create your first note
- 📁 Organize with folders
- 🎨 Try rich text formatting (bold, italic, lists)
- 📌 Pin important notes
- 🔍 Search your notes
- 🌙 Works in dark mode (if your system uses dark mode)

## Support

All code is committed to the `develop` branch:
- Latest commit: "refactor: move profile and settings pages to settings module"
- See `NAVIGATION_IMPLEMENTATION_SUMMARY.md` for full details
- See `NOTES_SETUP.md` for notes module details

Enjoy your new app! 🎉
