import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaRecorderOptions {
  sessionId: string;
  deviceId: string;
  onRecordingComplete?: (url: string) => void;
}

export const useMediaRecorder = ({ sessionId, deviceId, onRecordingComplete }: MediaRecorderOptions) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request high quality video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        }
      });

      streamRef.current = stream;

      // Use high quality settings for recording
      const options: any = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 8000000, // 8 Mbps for high quality
        audioBitsPerSecond: 256000    // 256 kbps for audio
      };

      // Fallback to H.264 if VP9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=h264,opus';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks(chunks);

        // Upload to Supabase Storage
        const fileName = `${sessionId}/${deviceId}/${Date.now()}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(fileName, blob, {
            contentType: 'video/webm',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Upload Failed",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('recordings')
          .getPublicUrl(fileName);

        // Save recording metadata to database
        const { error: dbError } = await supabase
          .from('session_recordings')
          .insert({
            session_id: sessionId,
            device_id: deviceId,
            recording_id: null // Will be linked later
          });

        if (dbError) {
          console.error('Database error:', dbError);
        }

        if (onRecordingComplete) {
          onRecordingComplete(publicUrl);
        }

        toast({
          title: "Recording Saved",
          description: "Your recording has been uploaded successfully",
        });
      };

      // Record in chunks for better handling
      mediaRecorder.start(1000); // 1 second chunks
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "High quality recording in progress",
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: error.message || "Failed to start recording",
        variant: "destructive",
      });
    }
  }, [sessionId, deviceId, onRecordingComplete, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    stream: streamRef.current
  };
};
