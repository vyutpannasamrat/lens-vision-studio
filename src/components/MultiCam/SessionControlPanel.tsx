import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Video, Users, StopCircle, Play } from 'lucide-react';
import DeviceList from './DeviceList';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';

interface SessionControlPanelProps {
  session: any;
  device: any;
  onLeave: () => void;
}

const SessionControlPanel = ({ session, device, onLeave }: SessionControlPanelProps) => {
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState(session);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMaster = device.role === 'master';

  const { isRecording, startRecording, stopRecording, stream } = useMediaRecorder({
    sessionId: session.id,
    deviceId: device.id,
    onRecordingComplete: (url) => {
      console.log('Recording uploaded:', url);
    }
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_devices',
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          loadDevices();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recording_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newSession = payload.new as any;
            setCurrentSession(newSession);
          }
        }
      )
      .subscribe();

    loadDevices();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Display video preview
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('session_devices')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading devices:', error);
      return;
    }

    setDevices(data || []);
  };

  const handleStartRecording = async () => {
    try {
      setLoading(true);

      // Start media recording first
      await startRecording();

      // Update session status
      const { error } = await supabase.functions.invoke('multi-cam-session', {
        body: {
          action: 'update_status',
          session_id: session.id,
          status: 'recording'
        }
      });

      if (error) throw error;

      toast({
        title: "Recording Started",
        description: "All devices are now recording",
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start recording",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setLoading(true);

      // Stop media recording first
      stopRecording();

      // Update session status
      const { error } = await supabase.functions.invoke('multi-cam-session', {
        body: {
          action: 'update_status',
          session_id: session.id,
          status: 'stopped'
        }
      });

      if (error) throw error;

      toast({
        title: "Recording Stopped",
        description: "All recordings saved successfully",
      });
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to stop recording",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Video Preview */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Camera Preview</h3>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Session: {session.session_code}</h2>
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? "Recording" : currentSession.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isMaster ? 'Master Device' : `Camera - ${device.angle_name}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Devices Grid */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connected Devices ({devices.length})
          </h3>
        </div>
        <DeviceList devices={devices} currentDeviceId={device.id} />
      </Card>

      {/* Controls */}
      {isMaster && (
        <Card className="p-6">
          <div className="flex gap-4">
            {!isRecording ? (
              <Button 
                size="lg" 
                className="flex-1"
                onClick={handleStartRecording}
                disabled={devices.length < 1 || loading}
              >
                <Play className="mr-2 h-5 w-5" />
                Start All Cameras
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive"
                className="flex-1"
                onClick={handleStopRecording}
                disabled={loading}
              >
                <StopCircle className="mr-2 h-5 w-5" />
                Stop All Cameras
              </Button>
            )}
          </div>

          {devices.length < 1 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Waiting for camera devices to join...
            </p>
          )}
        </Card>
      )}

      {/* Camera View for Non-Master */}
      {!isMaster && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <Video className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Camera Ready</h3>
              <p className="text-sm text-muted-foreground">
                {isRecording 
                  ? 'Recording in progress...' 
                  : 'Waiting for master to start recording'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Leave Session */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onLeave}>
          Leave Session
        </Button>
      </div>
    </div>
  );
};

export default SessionControlPanel;
