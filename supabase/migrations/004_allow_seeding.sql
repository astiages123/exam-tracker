-- Allow anonymous access for seeding (Development only)
-- This allows the seed_db.js script to read/write without a service role key

-- 1. Lessons Table Policies
CREATE POLICY "Allow anon all lessons" 
ON lessons 
FOR ALL 
TO anon 
USING (true)
WITH CHECK (true);

-- 2. Lesson Chunks Table Policies
CREATE POLICY "Allow anon all chunks" 
ON lesson_chunks 
FOR ALL 
TO anon 
USING (true)
WITH CHECK (true);
