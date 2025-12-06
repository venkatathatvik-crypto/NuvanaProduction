-- Create file_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.file_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on name and school_id
ALTER TABLE public.file_categories 
ADD CONSTRAINT file_categories_name_school_id_unique UNIQUE (name, school_id);

-- Enable RLS
ALTER TABLE public.file_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for file_categories
-- 1. School admins can do everything with their school's categories
CREATE POLICY "School admins can manage file categories" ON public.file_categories
    FOR ALL 
    USING (school_id = get_my_school_id())
    WITH CHECK (school_id = get_my_school_id());

-- 2. Teachers and students can view their school's categories
CREATE POLICY "Teachers and students can view file categories" ON public.file_categories
    FOR SELECT 
    USING (school_id = get_my_school_id());

-- Grant permissions
GRANT ALL ON public.file_categories:table TO authenticated;
GRANT SELECT ON public.file_categories TO authenticated;
GRANT ALL ON public.smallfile_categories TO authenticated;
život
GRANT SELECT ON Organizations
    SELECT ON public.file_categories TO service_role;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_file_categories_updated_at
    BEFORE UPDATE ON public.file_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
