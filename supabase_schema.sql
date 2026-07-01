-- Create courses table
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.milestones CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table linked to Supabase Auth
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student', -- 'student', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    icon TEXT,
    difficulty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    group_title TEXT,
    title TEXT NOT NULL,
    description TEXT,
    sequence_order INT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'pdf', 'quiz', 'exam'
    content_url TEXT,
    quiz_questions JSONB,
    days_left_from_enrollment INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    completed_milestones TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, course_id)
);

-- Insert dummy mockup data if empty
INSERT INTO public.courses (id, title, description, category, icon, difficulty) VALUES
('a32f6a6c-b394-4d83-93d3-a4e82e3f4201', 'Web Development Bootcamp', 'Learn HTML, CSS, JS, React and NextJS to build professional websites.', 'Development', '</>', 'Beginner'),
('b32f6a6c-b394-4d83-93d3-a4e82e3f4202', 'UI/UX Design Fundamentals', 'Master layout grids, wireframes, and high-fidelity prototype designing.', 'Design', '🎨', 'Intermediate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.milestones (id, course_id, title, description, sequence_order, content_type, content_url, quiz_questions, days_left_from_enrollment) VALUES
('a32f6a6c-b394-4d83-93d3-a4e82e3f4211', 'a32f6a6c-b394-4d83-93d3-a4e82e3f4201', 'HTML Basics Video', 'Introduction to HTML5 structure and markup rules.', 1, 'video', 'https://www.w3schools.com/html/mov_bbb.mp4', NULL, 2)
ON CONFLICT DO NOTHING;

-- Trigger to automatically create a profile record when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Student'), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Allow public read access to milestones" ON public.milestones FOR SELECT USING (true);
CREATE POLICY "Allow users to read their own enrollments" ON public.enrollments FOR SELECT USING (true);

-- Allow insertions & updates
CREATE POLICY "Allow users to enroll in courses" ON public.enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update enrollment details" ON public.enrollments FOR UPDATE USING (true);
CREATE POLICY "Allow admins full access to courses" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins full access to milestones" ON public.milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
