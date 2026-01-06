-- Migration to add lesson name to lesson_chunks for easier filtering and denormalization
ALTER TABLE lesson_chunks ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing records by fetching the name from the lessons table
UPDATE lesson_chunks lc
SET name = l.name
FROM lessons l
WHERE lc.lesson_id = l.id;

-- Make it NOT NULL for future consistency (optional, but good practice since every chunk belongs to a lesson)
-- COMMENTED OUT just in case there are edge cases, but the update above should cover existing data.
-- ALTER TABLE lesson_chunks ALTER COLUMN name SET NOT NULL;
