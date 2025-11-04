-- Create scripts table for AI-generated scripts
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  content_type TEXT,
  duration INTEGER,
  tone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on scripts
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Scripts policies
CREATE POLICY "Users can view their own scripts"
  ON public.scripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts"
  ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts"
  ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);

-- Create recording_sessions table for multi-cam
CREATE TABLE IF NOT EXISTS public.recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on recording_sessions
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;

-- Recording sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.recording_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.recording_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.recording_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create session_devices table
CREATE TABLE IF NOT EXISTS public.session_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  angle_name TEXT,
  role TEXT DEFAULT 'camera',
  connection_type TEXT,
  capabilities JSONB,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, device_id)
);

-- Enable RLS on session_devices
ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;

-- Session devices policies (accessible to session participants)
CREATE POLICY "Users can view devices in their sessions"
  ON public.session_devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_devices.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create devices in their sessions"
  ON public.session_devices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_devices.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update devices in their sessions"
  ON public.session_devices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_devices.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

-- Create session_recordings table
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.session_devices(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration INTEGER,
  file_size BIGINT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on session_recordings
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- Session recordings policies
CREATE POLICY "Users can view recordings from their sessions"
  ON public.session_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_recordings.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recordings in their sessions"
  ON public.session_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_recordings.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

-- Create storage bucket for video recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket
CREATE POLICY "Users can upload their own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own recordings"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recording_sessions_updated_at
  BEFORE UPDATE ON public.recording_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_devices_updated_at
  BEFORE UPDATE ON public.session_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for multi-cam tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_devices;