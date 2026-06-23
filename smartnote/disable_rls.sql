-- Disable RLS on notes table for development
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/update/delete notes (for development only)
-- In production, you should use proper RLS policies with authentication
