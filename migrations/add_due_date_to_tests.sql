-- Add due_date column to tests table
ALTER TABLE tests
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Add comment to the column
COMMENT ON COLUMN tests.due_date IS 'Optional deadline for students to complete the test/assignment';
