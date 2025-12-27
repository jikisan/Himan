# Notes Module

A Mac Notes-like application with three-panel layout, rich text editing, and folder organization.

## Features

### Core Functionality
- **Three-panel Layout**: Folders, Notes List, and Editor
- **Folder Management**: Create, rename, and delete folders with note counts
- **Notes Management**: Create, edit, delete notes with auto-save
- **Rich Text Editor**: Powered by Tiptap with formatting toolbar
  - Bold, Italic, Strikethrough
  - Headings (H1, H2, H3)
  - Bullet lists, ordered lists, task lists
  - Highlighting
- **Search**: Search within current folder or all notes
- **Pin Notes**: Keep important notes at the top
- **Relative Timestamps**: "2 hours ago", "3 days ago", etc.

### Technical Implementation
- **Clean Architecture**: Domain, Infrastructure, Presentation layers
- **Type Safety**: Full TypeScript with strict mode
- **Supabase Backend**: Real-time database with RLS policies
- **Auto-save**: Debounced content saving (1 second delay)
- **Responsive Design**: Mobile-friendly layout

## Directory Structure

```
notes/
├── domain/
│   ├── entities/          # Note and Folder entities with business logic
│   ├── types/             # TypeScript interfaces and DTOs
│   └── index.ts
├── infrastructure/
│   ├── repositories/      # Supabase repositories
│   └── index.ts
├── presentation/
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks (useNotes, useFolders, useEditor)
│   ├── pages/             # NotesPage
│   └── index.ts
└── index.ts
```

## Usage

### Importing
```typescript
import { NotesPage } from '@notes';
```

### Database Setup
Run the migration in `web/supabase/migrations/` to create the required tables and RLS policies.

### Routes
The NotesPage is already configured in the router at `/notes` as a protected route.

## Components

### NotesPage
Main container component that orchestrates the entire notes feature.

### FolderList
Left panel showing folders with create, rename, delete functionality.

### NotesList
Middle panel showing notes in the selected folder with search.

### NoteEditor
Right panel with rich text editing, formatting toolbar, and note actions.

## Hooks

### useNotes
Manages notes CRUD operations and state.
- `notes`: Array of notes
- `loading`: Loading state
- `createNote`: Create a new note
- `updateNote`: Update an existing note
- `deleteNote`: Delete a note

### useFolders
Manages folders CRUD operations and state.
- `folders`: Array of folders
- `loading`: Loading state
- `createFolder`: Create a new folder
- `updateFolder`: Update an existing folder
- `deleteFolder`: Delete a folder

### useEditor
Wraps Tiptap editor with auto-save and formatting controls.

## Database Schema

### folders
- `id`: UUID (primary key)
- `name`: TEXT
- `color`: TEXT (optional)
- `icon`: TEXT (optional)
- `user_id`: UUID (foreign key to auth.users)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### notes
- `id`: UUID (primary key)
- `title`: TEXT
- `content`: TEXT (HTML)
- `excerpt`: TEXT
- `folder_id`: UUID (foreign key to folders, nullable)
- `user_id`: UUID (foreign key to auth.users)
- `is_pinned`: BOOLEAN
- `tags`: TEXT[]
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Security

Row Level Security (RLS) is enabled on both tables:
- Users can only access their own folders and notes
- CRUD policies ensure data isolation per user

## Future Enhancements

- Tags management
- Note sharing
- Markdown export
- Attachments/images
- Collaborative editing
- Rich text paste from clipboard
- Keyboard shortcuts
- Note templates
