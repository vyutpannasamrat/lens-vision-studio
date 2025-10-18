import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Square, 
  Pause, 
  Play,
  Camera,
  Sparkles,
  Settings,
  ArrowLeft,
  FileText,
  ImageIcon,
  Droplet,
  Repeat,
  Shield,
  X,
  Plus,
  Minus,
  Gauge
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ScriptGeneratorDialog from "@/components/ScriptGeneratorDialog";
import ScriptEditorDialog from "@/components/ScriptEditorDialog";
import { Session } from "@supabase/supabase-js";

const Record = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [textSize, setTextSize] = useState(24);
  const [teleprompterText, setTeleprompterText] = useState(
    "Have you ever found yourself longing for a holiday outside the typical calendar celebrations?\n\nToday, we're going to explore the world of unusual holidays.\n\nThese are the quirky, lesser-known days that add a little extra joy to our year.\n\nFrom National Ice Cream Day to Talk Like a Pirate Day, there's a celebration for almost everything.\n\nSo grab your favorite snack, sit back, and let's dive into the wonderful world of unique holidays that you probably never knew existed."
  );
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [cameraFilter, setCameraFilter] = useState("none");
  const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Auto-scroll teleprompter
  useEffect(() => {
    if (showTeleprompter && scrollContainerRef.current) {
      const scrollInterval = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed / 50;
        }
      }, 50);
      
      return () => clearInterval(scrollInterval);
    }
  }, [showTeleprompter, scrollSpeed]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { min: 1280, ideal: 1920, max: 4096 },
          height: { min: 720, ideal: 1080, max: 2160 },
          frameRate: { ideal: 60, max: 60 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      toast({
        title: "Camera ready",
        description: "Your camera is now active",
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to record videos",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setCameraEnabled(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const startRecording = () => {
    if (!stream) {
      toast({
        title: "No camera access",
        description: "Please enable camera to start recording",
        variant: "destructive",
      });
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        
        try {
          // Generate thumbnail from video
          const thumbnailBlob = await generateThumbnail(blob);
          
          // Upload to Supabase Storage
          const fileName = `${session?.user.id}/${Date.now()}.mp4`;
          const thumbnailFileName = `${session?.user.id}/thumbs/${Date.now()}.jpg`;
          
          toast({
            title: "Uploading video...",
            description: "Please wait while we save your recording",
          });

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(fileName, blob, {
              contentType: 'video/mp4',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Upload thumbnail
          let thumbnailUrl = null;
          if (thumbnailBlob) {
            const { error: thumbError } = await supabase.storage
              .from('recordings')
              .upload(thumbnailFileName, thumbnailBlob, {
                contentType: 'image/jpeg',
                upsert: false
              });
            
            if (!thumbError) {
              const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
                .from('recordings')
                .getPublicUrl(thumbnailFileName);
              thumbnailUrl = thumbPublicUrl;
            }
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('recordings')
            .getPublicUrl(fileName);

          // Save recording metadata to database
          const { error: dbError } = await supabase
            .from('recordings')
            .insert({
              user_id: session?.user.id,
              title: `Recording ${new Date().toLocaleDateString()}`,
              video_url: publicUrl,
              duration: recordingTime,
              script_id: currentScriptId,
              thumbnail_url: thumbnailUrl
            });

          if (dbError) throw dbError;

          chunksRef.current = [];
          
          toast({
            title: "Recording saved",
            description: "Your video has been saved to history",
          });
        } catch (error) {
          console.error('Error saving recording:', error);
          
          // Fallback: download locally
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `recording-${Date.now()}.mp4`;
          a.click();
          
          toast({
            title: "Saved locally",
            description: "Video couldn't be uploaded but was downloaded",
            variant: "destructive",
          });
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      toast({
        title: "Recording started",
        description: "Your video is being recorded",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not start recording",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
    }
  };

  const generateThumbnail = (videoBlob: Blob): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.src = URL.createObjectURL(videoBlob);
      video.currentTime = 1; // Capture frame at 1 second
      
      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
    });
  };

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !session) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast({
          title: "Error",
          description: "Failed to capture snapshot",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileName = `${session.user.id}/${Date.now()}-snapshot.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('snapshots')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('snapshots')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('snapshots')
          .insert({
            user_id: session.user.id,
            image_url: publicUrl,
            title: `Snapshot ${new Date().toLocaleString()}`,
          });

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: "Snapshot saved successfully!",
        });
      } catch (error: any) {
        console.error('Error saving snapshot:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save snapshot",
          variant: "destructive",
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilterStyle = () => {
    switch (cameraFilter) {
      case "vivid": return "saturate(1.5) contrast(1.1)";
      case "warm": return "sepia(0.3) saturate(1.2)";
      case "cool": return "hue-rotate(180deg) saturate(1.1)";
      case "bw": return "grayscale(1) contrast(1.1)";
      case "vintage": return "sepia(0.5) contrast(1.2) brightness(0.9)";
      case "cinematic": return "contrast(1.2) saturate(0.9) brightness(0.95)";
      default: return "none";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-lg z-10">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-bold">Recording Studio</span>
          </div>
          
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </nav>
      </header>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ filter: getFilterStyle() }}
        />

        {/* Left Control Panel */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button
            onClick={() => setShowTeleprompter(!showTeleprompter)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all backdrop-blur-md ${
              showTeleprompter 
                ? 'bg-white/90 text-black' 
                : 'bg-black/30 text-white hover:bg-black/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">Teleprompter</span>
          </button>

          <button
            onClick={takeSnapshot}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all"
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Snapshot</span>
          </button>
          
          <canvas ref={canvasRef} className="hidden" />

          <div className="relative group">
            <button
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all"
            >
              <Droplet className="w-5 h-5" />
              <span className="text-sm font-medium">Filters</span>
              <span className="text-xs opacity-70 capitalize">{cameraFilter === "none" ? "Off" : cameraFilter}</span>
            </button>
            <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-black/90 backdrop-blur-md rounded-lg p-2 min-w-32">
              {["none", "vivid", "warm", "cool", "bw", "vintage", "cinematic"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCameraFilter(filter)}
                  className={`w-full text-left px-3 py-2 rounded text-sm text-white hover:bg-white/20 transition-all capitalize ${
                    cameraFilter === filter ? 'bg-white/30' : ''
                  }`}
                >
                  {filter === "none" ? "No Filter" : filter === "bw" ? "Black & White" : filter}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={switchCamera}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all"
          >
            <Repeat className="w-5 h-5" />
            <span className="text-sm font-medium">Flip Cameras</span>
          </button>

          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all"
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Stabilisation</span>
            <span className="text-xs opacity-70">Standard</span>
          </button>

          <button
            onClick={toggleMic}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all"
          >
            <Mic className="w-5 h-5" />
            <span className="text-sm font-medium">Microphone</span>
            <span className="text-xs opacity-70">{micEnabled ? 'On' : 'Off'}</span>
          </button>

          <Link to="/">
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-all">
              <X className="w-5 h-5" />
              <span className="text-sm font-medium">Close</span>
            </button>
          </Link>
        </div>

        {/* Teleprompter Overlay */}
        {showTeleprompter && (
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/80 via-black/60 to-transparent flex items-center justify-center p-8">
            <div className="w-full max-w-2xl h-full flex flex-col">
              {/* Teleprompter Controls */}
              <div className="flex items-center justify-between mb-4 bg-black/50 backdrop-blur-md rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  
                  <div className="text-white">
                    <div className="text-xs opacity-70 mb-1">Scroll Speed</div>
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      <span className="text-sm font-medium">{scrollSpeed}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setTextSize(Math.max(12, textSize - 2))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-white text-sm min-w-12 text-center">{textSize}px</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setTextSize(Math.min(48, textSize + 2))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Advanced Settings Panel */}
              {showSettings && (
                <div className="bg-black/70 backdrop-blur-md rounded-lg p-4 mb-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-white text-sm mb-2 block">Scroll Speed</label>
                      <Slider
                        value={[scrollSpeed]}
                        onValueChange={(value) => setScrollSpeed(value[0])}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Text Size</label>
                      <Slider
                        value={[textSize]}
                        onValueChange={(value) => setTextSize(value[0])}
                        max={48}
                        min={12}
                        step={2}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Teleprompter Text Display */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto scrollbar-hide"
                style={{ 
                  scrollBehavior: 'smooth'
                }}
              >
                <div 
                  className="text-white leading-relaxed whitespace-pre-wrap"
                  style={{ 
                    fontSize: `${textSize}px`,
                    lineHeight: '1.8'
                  }}
                >
                  {teleprompterText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 px-4 py-2 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white font-mono font-bold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Script Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setShowScriptEditor(true)}
          >
            <FileText className="w-4 h-4" />
            {teleprompterText ? "Edit Script" : "Add Script"}
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-2"
            onClick={() => setShowScriptDialog(true)}
          >
            <Sparkles className="w-4 h-4" />
            AI Generate
          </Button>
        </div>

        {/* Script Generator Dialog */}
        <ScriptGeneratorDialog
          open={showScriptDialog}
          onOpenChange={setShowScriptDialog}
          onScriptGenerated={(script, scriptId) => {
            setTeleprompterText(script);
            setCurrentScriptId(scriptId);
            setShowTeleprompter(true);
          }}
        />

        {/* Script Editor Dialog */}
        <ScriptEditorDialog
          open={showScriptEditor}
          onOpenChange={setShowScriptEditor}
          currentScript={teleprompterText}
          scriptId={currentScriptId}
          onScriptUpdated={(script, scriptId) => {
            setTeleprompterText(script);
            setCurrentScriptId(scriptId);
            setShowTeleprompter(true);
          }}
        />

        {/* Recording Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="container mx-auto max-w-2xl">
            {/* Main Controls */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Camera Toggle */}
              <Button
                size="icon"
                variant="secondary"
                className="w-14 h-14 rounded-full"
                onClick={toggleCamera}
                disabled={isRecording}
              >
                {cameraEnabled ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </Button>

              {/* Record/Stop Button */}
              {!isRecording ? (
                <Button
                  size="icon"
                  className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 glow-primary"
                  onClick={startRecording}
                >
                  <div className="w-6 h-6 bg-white rounded-full" />
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-14 h-14 rounded-full"
                    onClick={pauseRecording}
                  >
                    {isPaused ? (
                      <Play className="w-6 h-6" />
                    ) : (
                      <Pause className="w-6 h-6" />
                    )}
                  </Button>
                  
                  <Button
                    size="icon"
                    className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90"
                    onClick={stopRecording}
                  >
                    <Square className="w-6 h-6" />
                  </Button>
                </div>
              )}

              {/* Mic Toggle */}
              <Button
                size="icon"
                variant="secondary"
                className="w-14 h-14 rounded-full"
                onClick={toggleMic}
                disabled={isRecording}
              >
                {micEnabled ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* Additional Controls */}
            {!isRecording && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={switchCamera}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Switch Camera
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!isRecording && (
        <div className="border-t border-border/40 bg-card p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Tips
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tap the red button to start recording</li>
                <li>• Use good lighting for best results</li>
                <li>• Enable microphone for audio capture</li>
                <li>• Generate AI scripts for guided recording</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Record;
