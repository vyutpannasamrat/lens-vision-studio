-- Create storage bucket for video recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
);

-- Create RLS policies for recordings bucket
CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create recordings table to track video history
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  duration INTEGER, -- duration in seconds
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on recordings
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recordings table
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

-- Create trigger for updated_at
CREATE TRIGGER update_recordings_updated_at
BEFORE UPDATE ON public.recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();