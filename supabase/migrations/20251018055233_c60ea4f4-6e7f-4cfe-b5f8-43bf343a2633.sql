-- Create snapshots table
CREATE TABLE IF NOT EXISTS public.snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for snapshots
CREATE POLICY "Users can view their own snapshots"
  ON public.snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
  ON public.snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON public.snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Create editing_projects table for video editing
CREATE TABLE IF NOT EXISTS public.editing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timeline_data JSONB DEFAULT '[]'::jsonb,
  captions JSONB DEFAULT '[]'::jsonb,
  edited_video_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for editing_projects
ALTER TABLE public.editing_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for editing_projects
CREATE POLICY "Users can view their own editing projects"
  ON public.editing_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own editing projects"
  ON public.editing_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own editing projects"
  ON public.editing_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own editing projects"
  ON public.editing_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_editing_projects_updated_at
  BEFORE UPDATE ON public.editing_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for snapshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('snapshots', 'snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for snapshots bucket
CREATE POLICY "Users can view their own snapshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own snapshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own snapshots"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);