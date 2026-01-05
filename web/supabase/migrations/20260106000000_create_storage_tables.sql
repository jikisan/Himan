-- Add storage-related columns to usage_limits table
ALTER TABLE usage_limits
ADD COLUMN IF NOT EXISTS files_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_folders_count INTEGER NOT NULL DEFAULT 0;

-- Create storage_folders table
CREATE TABLE IF NOT EXISTS storage_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  files_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES storage_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 255),
  size BIGINT NOT NULL CHECK (size >= 0),
  mime_type TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_folders_user_id ON storage_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);

-- Enable Row Level Security
ALTER TABLE storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_folders table
CREATE POLICY "Users can view their own storage folders"
  ON storage_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own storage folders"
  ON storage_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage folders"
  ON storage_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storage folders"
  ON storage_folders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for files table
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_storage_folders_updated_at
  BEFORE UPDATE ON storage_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update increment_usage_count function to handle storage tables
CREATE OR REPLACE FUNCTION increment_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  count_column TEXT;
BEGIN
  -- Determine which counter to increment based on table name
  CASE TG_TABLE_NAME
    WHEN 'notes' THEN count_column := 'notes_count';
    WHEN 'folders' THEN count_column := 'folders_count';
    WHEN 'passwords' THEN count_column := 'passwords_count';
    WHEN 'password_categories' THEN count_column := 'categories_count';
    WHEN 'files' THEN count_column := 'files_count';
    WHEN 'storage_folders' THEN count_column := 'storage_folders_count';
  END CASE;

  -- Increment the appropriate counter
  EXECUTE format(
    'UPDATE usage_limits SET %I = %I + 1 WHERE user_id = $1',
    count_column, count_column
  ) USING NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update decrement_usage_count function to handle storage tables
CREATE OR REPLACE FUNCTION decrement_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  count_column TEXT;
BEGIN
  -- Determine which counter to decrement based on table name
  CASE TG_TABLE_NAME
    WHEN 'notes' THEN count_column := 'notes_count';
    WHEN 'folders' THEN count_column := 'folders_count';
    WHEN 'passwords' THEN count_column := 'passwords_count';
    WHEN 'password_categories' THEN count_column := 'categories_count';
    WHEN 'files' THEN count_column := 'files_count';
    WHEN 'storage_folders' THEN count_column := 'storage_folders_count';
  END CASE;

  -- Decrement the appropriate counter (ensure it doesn't go below 0)
  EXECUTE format(
    'UPDATE usage_limits SET %I = GREATEST(%I - 1, 0) WHERE user_id = $1',
    count_column, count_column
  ) USING OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update storage_used when file is added
CREATE OR REPLACE FUNCTION increment_storage_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usage_limits
  SET storage_used = storage_used + NEW.size
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update storage_used when file is deleted
CREATE OR REPLACE FUNCTION decrement_storage_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usage_limits
  SET storage_used = GREATEST(storage_used - OLD.size, 0)
  WHERE user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update storage_used when file size changes
CREATE OR REPLACE FUNCTION update_storage_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usage_limits
  SET storage_used = storage_used - OLD.size + NEW.size
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update folder file count
CREATE OR REPLACE FUNCTION update_folder_file_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.folder_id IS NOT NULL THEN
      UPDATE storage_folders
      SET files_count = files_count + 1
      WHERE id = NEW.folder_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.folder_id IS NOT NULL THEN
      UPDATE storage_folders
      SET files_count = GREATEST(files_count - 1, 0)
      WHERE id = OLD.folder_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle folder change
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      IF OLD.folder_id IS NOT NULL THEN
        UPDATE storage_folders
        SET files_count = GREATEST(files_count - 1, 0)
        WHERE id = OLD.folder_id;
      END IF;
      IF NEW.folder_id IS NOT NULL THEN
        UPDATE storage_folders
        SET files_count = files_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for files table (file count)
CREATE TRIGGER increment_files_count
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_files_count
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for storage_folders table (folder count)
CREATE TRIGGER increment_storage_folders_count
  AFTER INSERT ON storage_folders
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_storage_folders_count
  AFTER DELETE ON storage_folders
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for files table (storage usage)
CREATE TRIGGER increment_storage_on_file_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION increment_storage_used();

CREATE TRIGGER decrement_storage_on_file_delete
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION decrement_storage_used();

CREATE TRIGGER update_storage_on_file_update
  AFTER UPDATE OF size ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_used();

-- Create triggers for folder file counts
CREATE TRIGGER update_folder_count_on_file_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_file_count();

CREATE TRIGGER update_folder_count_on_file_delete
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_file_count();

CREATE TRIGGER update_folder_count_on_file_update
  AFTER UPDATE OF folder_id ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_file_count();

-- Update existing users' usage_limits with current file counts
UPDATE usage_limits ul
SET
  files_count = COALESCE((SELECT COUNT(*) FROM files WHERE user_id = ul.user_id), 0),
  storage_used = COALESCE((SELECT SUM(size) FROM files WHERE user_id = ul.user_id), 0),
  storage_folders_count = COALESCE((SELECT COUNT(*) FROM storage_folders WHERE user_id = ul.user_id), 0);
