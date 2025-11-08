-- Create enum for collaborator roles
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'editor', 'viewer');

-- Create project_collaborators table
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.editing_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.collaborator_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);

-- Create project_activity table for tracking changes
CREATE TABLE public.project_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.editing_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_comments table
CREATE TABLE public.project_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.editing_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  timestamp_seconds NUMERIC,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM editing_projects ep
    WHERE ep.id = project_uuid 
    AND ep.user_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators pc
    WHERE pc.project_id = project_uuid 
    AND pc.user_id = user_uuid
  );
$$;

-- Security definer function to get user role on project
CREATE OR REPLACE FUNCTION public.get_project_role(project_uuid UUID, user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN ep.user_id = user_uuid THEN 'owner'
      ELSE COALESCE(pc.role::text, 'none')
    END
  FROM editing_projects ep
  LEFT JOIN project_collaborators pc ON pc.project_id = project_uuid AND pc.user_id = user_uuid
  WHERE ep.id = project_uuid
  LIMIT 1;
$$;

-- RLS Policies for project_collaborators
CREATE POLICY "Users can view collaborators on projects they can access"
ON public.project_collaborators
FOR SELECT
USING (public.can_access_project(project_id, auth.uid()));

CREATE POLICY "Project owners can add collaborators"
ON public.project_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM editing_projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update collaborators"
ON public.project_collaborators
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM editing_projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can remove collaborators"
ON public.project_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM editing_projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

-- RLS Policies for project_activity
CREATE POLICY "Users can view activity on projects they can access"
ON public.project_activity
FOR SELECT
USING (public.can_access_project(project_id, auth.uid()));

CREATE POLICY "Users can create activity on projects they can access"
ON public.project_activity
FOR INSERT
WITH CHECK (
  public.can_access_project(project_id, auth.uid()) 
  AND user_id = auth.uid()
);

-- RLS Policies for project_comments
CREATE POLICY "Users can view comments on projects they can access"
ON public.project_comments
FOR SELECT
USING (public.can_access_project(project_id, auth.uid()));

CREATE POLICY "Users can create comments on projects they can access"
ON public.project_comments
FOR INSERT
WITH CHECK (
  public.can_access_project(project_id, auth.uid()) 
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.project_comments
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments or project owners can delete any"
ON public.project_comments
FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM editing_projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Update editing_projects RLS to allow collaborators to view
DROP POLICY IF EXISTS "Users can view their own editing projects" ON public.editing_projects;

CREATE POLICY "Users can view projects they own or collaborate on"
ON public.editing_projects
FOR SELECT
USING (public.can_access_project(id, auth.uid()));

-- Add policy for editors to update projects
CREATE POLICY "Editors can update projects"
ON public.editing_projects
FOR UPDATE
USING (
  public.get_project_role(id, auth.uid()) IN ('owner', 'editor')
);

-- Triggers for updated_at
CREATE TRIGGER update_project_comments_updated_at
BEFORE UPDATE ON public.project_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_project_collaborators_project_id ON public.project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON public.project_collaborators(user_id);
CREATE INDEX idx_project_activity_project_id ON public.project_activity(project_id);
CREATE INDEX idx_project_activity_created_at ON public.project_activity(created_at DESC);
CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Enable realtime for collaboration features
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;