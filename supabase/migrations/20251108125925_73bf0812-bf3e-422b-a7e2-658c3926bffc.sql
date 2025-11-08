-- Create recordings table for user video recordings
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create editing_projects table for video editing sessions
CREATE TABLE public.editing_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timeline_data JSONB,
  captions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create snapshots table for photo captures
CREATE TABLE public.snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recordings table
CREATE POLICY "Users can view their own recordings"
ON public.recordings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
ON public.recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
ON public.recordings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
ON public.recordings
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for editing_projects table
CREATE POLICY "Users can view their own editing projects"
ON public.editing_projects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own editing projects"
ON public.editing_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own editing projects"
ON public.editing_projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own editing projects"
ON public.editing_projects
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for snapshots table
CREATE POLICY "Users can view their own snapshots"
ON public.snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
ON public.snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
ON public.snapshots
FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_recordings_updated_at
BEFORE UPDATE ON public.recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_editing_projects_updated_at
BEFORE UPDATE ON public.editing_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX idx_recordings_created_at ON public.recordings(created_at DESC);
CREATE INDEX idx_editing_projects_user_id ON public.editing_projects(user_id);
CREATE INDEX idx_editing_projects_recording_id ON public.editing_projects(recording_id);
CREATE INDEX idx_snapshots_user_id ON public.snapshots(user_id);

-- Enable realtime for recordings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;