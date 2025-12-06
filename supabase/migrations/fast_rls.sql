-- 1. Add new roles to user_roles table
-- Assuming 1=student, 2=teacher based on existing app, adding next IDs.
-- If IDs are different in prod, this might need adjustment, but for now we follow sequence.
INSERT INTO public.user_roles (id, role) 
VALUES 
  (3, 'school_admin'), 
  (4, 'super_admin') 
ON CONFLICT (id) DO NOTHING;

-- 2. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.get_my_school_id() 
RETURNS uuid AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin() 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Enable RLS on core tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_subjects ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- SCHOOLS
CREATE POLICY "Super Admin full access schools" ON public.schools
  FOR ALL TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users view their own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_my_school_id());

-- PROFILES
CREATE POLICY "Super Admin full access profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users view profiles in their school" ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = public.get_my_school_id());

CREATE POLICY "School Admin manage profiles in their school" ON public.profiles
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() AND (
    SELECT role FROM public.user_roles WHERE id = (SELECT role_id FROM public.profiles WHERE id = auth.uid())
  ) = 'school_admin');
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- CLASSES
CREATE POLICY "School Access Classes" ON public.classes
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- GRADE LEVELS
CREATE POLICY "School Access Grade Levels" ON public.grade_levels
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- ANNOUNCEMENTS
CREATE POLICY "School Access Announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- ATTENDANCE
CREATE POLICY "School Access Attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- TESTS
CREATE POLICY "School Access Tests" ON public.tests
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- FILES (Resources)
CREATE POLICY "School Access Files" ON public.files
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- GRADE SUBJECTS (Indirect link via Grade Level)
CREATE POLICY "School Access Grade Subjects" ON public.grade_subjects
  FOR ALL TO authenticated
  USING (
    grade_level_id IN (
      SELECT id FROM public.grade_levels WHERE school_id = public.get_my_school_id()
    ) OR public.is_super_admin()
  );

-- EXAM TYPES
CREATE POLICY "School Access Exam Types" ON public.exam_types
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());

-- VOICE NOTES
CREATE POLICY "School Access Voice Notes" ON public.voice_notes
  FOR ALL TO authenticated
  USING (school_id = public.get_my_school_id() OR public.is_super_admin());
