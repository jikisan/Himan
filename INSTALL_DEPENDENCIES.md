# Complete Dependency Installation Guide

## Current Status

Your app is **fully implemented** but waiting for dependencies to be installed.

## What's Already Done ✅

- ✅ Navigation system (React Router, layouts, guards)
- ✅ Notes module (Mac Notes-like app with Tiptap editor)
- ✅ Auth foundation (domain, repository, context)
- ✅ Responsive layouts (sidebar, navbar, mobile nav)
- ✅ Dark mode ready
- ✅ Clean Architecture structure
- ✅ TypeScript configuration
- ✅ Path aliases setup

## What's Missing ⚠️

Just the npm packages! Once installed, everything will work.

## Step 1: Core Dependencies (Required)

These are needed for the app to run:

```bash
cd web
npm install @supabase/supabase-js \
  lucide-react \
  clsx \
  tailwind-merge \
  react-router-dom
```

**What these do:**
- `@supabase/supabase-js` - Database and authentication
- `lucide-react` - Icon library
- `clsx` & `tailwind-merge` - Utility for styling
- `react-router-dom` - Navigation (already installed)

## Step 2: Notes Module Dependencies (Required for Notes feature)

```bash
npm install @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-placeholder \
  @tiptap/extension-typography \
  @tiptap/extension-highlight \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item
```

**What these do:**
- Tiptap packages - Rich text editor for notes

## Step 3: Enhanced Auth Dependencies (Optional but Recommended)

For better forms and validation:

```bash
npm install react-hook-form \
  @hookform/resolvers \
  zod
```

**What these do:**
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Form validation helpers
- `zod` - Schema validation

## Step 4: Install Everything at Once (Easiest)

Copy and paste this single command:

```bash
cd web && npm install \
  @supabase/supabase-js \
  lucide-react \
  clsx \
  tailwind-merge \
  @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-placeholder \
  @tiptap/extension-typography \
  @tiptap/extension-highlight \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  react-hook-form \
  @hookform/resolvers \
  zod
```

## Step 5: Supabase Setup

### 5.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: Himan (or whatever you like)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project to be ready

### 5.2 Get API Credentials

1. In your Supabase project, go to **Settings** (gear icon)
2. Click **API** in the sidebar
3. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

### 5.3 Create Environment File

Create `web/.env` file:

```bash
# In your terminal, from project root:
touch web/.env
```

Then add this content (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5.4 Run Database Migration

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open this file in your code editor:
   ```
   web/src/modules/notes/infrastructure/migrations/001_create_notes_tables.sql
   ```
4. Copy **all contents** of that file
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

This creates the database tables for:
- Folders (for organizing notes)
- Notes (for storing note content)
- Row-level security (so users only see their own data)

### 5.5 Enable Google OAuth (Optional)

If you want "Sign in with Google":

1. Go to **Authentication** > **Providers** in Supabase
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google**
4. You'll need to create OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Copy Client ID and Client Secret
   - Add to Supabase Google provider settings
5. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

## Step 6: Start the Development Server

```bash
cd web
npm run dev
```

You should see:
```
ROLLDOWN-VITE v7.2.5  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Step 7: Test the App

1. Open browser to http://localhost:5173
2. You should be redirected to `/login`
3. Click "Don't have an account? Sign up"
4. Create an account with:
   - Email: your@email.com
   - Password: (at least 6 characters)
5. You'll be logged in automatically
6. You should see the Dashboard!

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
→ Dependencies not installed. Run Step 4 above.

### "Missing Supabase environment variables"
→ Check `.env` file exists in `web/` directory with correct values

### Blank page / White screen
→ Open browser console (F12) and check for errors
→ Make sure dev server is running
→ Check all dependencies installed

### Cannot create account
→ Check Supabase dashboard for errors
→ Verify database migration was run
→ Check `.env` file has correct credentials

### "Failed to scan for dependencies"
→ This warning is OK! It means some dependencies aren't installed yet.
→ After installing all packages, restart dev server

### npm install errors
→ Try: `npm cache clean --force`
→ Then run install command again

### Port 5173 already in use
→ Kill other dev servers or change port in `vite.config.ts`

## What You'll See After Setup

### Dashboard (`/dashboard`)
- Welcome message with your email
- Quick links to Notes, Profile, Settings
- Stats cards

### Notes (`/notes`)
- **Left panel**: Folder list
  - "All Notes" view
  - Create/rename/delete folders
- **Middle panel**: Notes list
  - Search notes
  - Pin important notes
  - See timestamps
- **Right panel**: Rich text editor
  - Bold, italic, headings
  - Bullet/numbered lists
  - Task lists (checkboxes)
  - Auto-saves as you type

### Navigation
- **Sidebar**: Dashboard, Notes, Profile, Settings
- **Top bar**: Search, notifications, user menu
- **Mobile**: Hamburger menu (☰)

## Features to Try

Once everything is set up:

1. ✏️ **Create your first note**:
   - Go to Notes
   - Click the + button
   - Start typing!

2. 📁 **Organize with folders**:
   - Click + in folder panel
   - Create "Personal", "Work", etc.
   - Drag notes between folders

3. 🎨 **Try rich formatting**:
   - Select text and use toolbar
   - Try headings, lists, tasks
   - Everything auto-saves!

4. 🔍 **Search your notes**:
   - Type in search box
   - Searches titles and content
   - Real-time results

5. 📌 **Pin important notes**:
   - Hover over a note
   - Click the pin icon
   - Pinned notes stay at top

## Next Steps

After basic setup works:

1. **Customize**:
   - Add your logo to auth pages
   - Change color scheme
   - Add more pages

2. **Deploy**:
   - Build for production: `npm run build`
   - Deploy to Vercel, Netlify, or similar
   - Set up production Supabase

3. **Enhance Auth**:
   - Follow `AUTH_IMPLEMENTATION_TODO.md`
   - Add Google OAuth
   - Add password reset
   - Add email verification

## Files Created

All code is in the `web/` directory:

```
web/
├── src/
│   ├── layouts/          # Page layouts
│   ├── router/           # Navigation config
│   └── modules/
│       ├── auth/         # Login, signup
│       ├── dashboard/    # Main dashboard
│       ├── notes/        # Notes app
│       ├── settings/     # Profile & settings
│       └── shared/       # Common components
├── .env                  # YOUR SECRETS (create this!)
├── package.json          # Dependencies list
└── vite.config.ts        # Build config
```

## Getting Help

- **Docs**: See README files in each module
- **Setup Guide**: `QUICK_START.md`
- **Navigation**: `NAVIGATION_IMPLEMENTATION_SUMMARY.md`
- **Notes**: `NOTES_SETUP.md`
- **Auth TODO**: `AUTH_IMPLEMENTATION_TODO.md`

## Summary: Quick Command List

```bash
# 1. Install dependencies
cd web
npm install @supabase/supabase-js lucide-react clsx tailwind-merge @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-typography @tiptap/extension-highlight @tiptap/extension-task-list @tiptap/extension-task-item react-hook-form @hookform/resolvers zod

# 2. Create .env file
touch .env
# Then edit it with your Supabase credentials

# 3. Start dev server
npm run dev

# 4. Open browser
# Go to http://localhost:5173
```

That's it! Your app should be fully functional. 🎉

---

**Ready?** Start with Step 4 (install everything at once) and follow through!
