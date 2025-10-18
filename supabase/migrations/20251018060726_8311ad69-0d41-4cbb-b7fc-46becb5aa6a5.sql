-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('waiting', 'ready', 'recording', 'stopped', 'completed');

-- Create enum for device role
CREATE TYPE public.device_role AS ENUM ('master', 'camera');

-- Create enum for device status
CREATE TYPE public.device_status AS ENUM ('connected', 'ready', 'recording', 'disconnected');

-- Create recording_sessions table
CREATE TABLE public.recording_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  master_device_id UUID,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.session_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  connection_type TEXT NOT NULL DEFAULT 'internet',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create session_devices table
CREATE TABLE public.session_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.device_role NOT NULL,
  angle_name TEXT,
  status public.device_status NOT NULL DEFAULT 'connected',
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  capabilities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, device_id)
);

-- Create session_recordings table
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.session_devices(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  angle_name TEXT,
  is_primary_angle BOOLEAN DEFAULT false,
  sync_offset_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recording_sessions
CREATE POLICY "Users can create their own sessions"
  ON public.recording_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view sessions they created or joined"
  ON public.recording_sessions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.session_devices
      WHERE session_devices.session_id = recording_sessions.id
      AND session_devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own sessions"
  ON public.recording_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.recording_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for session_devices
CREATE POLICY "Users can add devices to sessions they're part of"
  ON public.session_devices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_devices.session_id
      AND (recording_sessions.user_id = auth.uid() OR recording_sessions.status = 'waiting')
    )
  );

CREATE POLICY "Users can view devices in their sessions"
  ON public.session_devices FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.recording_sessions
      WHERE recording_sessions.id = session_devices.session_id
      AND recording_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own devices"
  ON public.session_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.session_devices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for session_recordings
CREATE POLICY "Users can create session recordings for their devices"
  ON public.session_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_devices
      WHERE session_devices.id = session_recordings.device_id
      AND session_devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view session recordings they're part of"
  ON public.session_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_devices
      WHERE session_devices.session_id = session_recordings.session_id
      AND session_devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their session recordings"
  ON public.session_recordings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_devices
      WHERE session_devices.id = session_recordings.device_id
      AND session_devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their session recordings"
  ON public.session_recordings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_devices
      WHERE session_devices.id = session_recordings.device_id
      AND session_devices.user_id = auth.uid()
    )
  );

-- Enable realtime for all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_recordings;