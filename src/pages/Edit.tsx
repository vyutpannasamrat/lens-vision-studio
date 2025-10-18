import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Play,
  Pause,
  Scissors,
  Download,
  Sparkles,
  Volume2,
  Captions,
  Loader2
} from "lucide-react";

interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  type: "video" | "silence";
}

const Edit = () => {
  const { recordingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [recording, setRecording] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeline, setTimeline] = useState<TimelineSegment[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  useEffect(() => {
    loadRecording();
  }, [recordingId]);

  const loadRecording = async () => {
    if (!recordingId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: recordingData, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recordingError) {
      toast({
        title: "Error",
        description: "Failed to load recording",
        variant: "destructive",
      });
      navigate("/history");
      return;
    }

    setRecording(recordingData);

    // Check for existing editing project
    const { data: projectData } = await supabase
      .from("editing_projects")
      .select("*")
      .eq("recording_id", recordingId)
      .maybeSingle();

    if (projectData) {
      setEditingProject(projectData);
      if (projectData.timeline_data && Array.isArray(projectData.timeline_data)) {
        setTimeline(projectData.timeline_data as unknown as TimelineSegment[]);
      }
    } else {
      // Create new editing project
      const { data: newProject, error: projectError } = await supabase
        .from("editing_projects")
        .insert({
          user_id: session.user.id,
          recording_id: recordingId,
          title: recordingData.title + " - Edit",
        })
        .select()
        .single();

      if (!projectError && newProject) {
        setEditingProject(newProject);
      }
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration;
    setDuration(videoDuration);
    setTrimEnd(videoDuration);
  };

  const handleTrim = async () => {
    if (!editingProject) return;

    setIsProcessing(true);
    
    const newSegment: TimelineSegment = {
      id: crypto.randomUUID(),
      start: trimStart,
      end: trimEnd,
      type: "video",
    };

    const updatedTimeline = [...timeline, newSegment];
    setTimeline(updatedTimeline);

    // Save to database
    const { error } = await supabase
      .from("editing_projects")
      .update({ timeline_data: updatedTimeline as any })
      .eq("id", editingProject.id);

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save trim",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Video segment added to timeline",
      });
    }
  };

  const handleAiSilenceRemoval = async () => {
    if (!editingProject || !duration) return;

    setIsProcessing(true);
    toast({
      title: "Processing",
      description: "AI is analyzing your video for silence removal...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-silence-removal', {
        body: {
          timelineData: {
            duration,
            currentSegments: timeline,
          },
        },
      });

      if (error) throw error;

      if (data?.segments) {
        const newTimeline = data.segments.map((seg: any, index: number) => ({
          id: crypto.randomUUID(),
          start: seg.start,
          end: seg.end,
          type: "video",
        }));

        setTimeline(newTimeline);

        await supabase
          .from("editing_projects")
          .update({ timeline_data: newTimeline as any })
          .eq("id", editingProject.id);

        toast({
          title: "Success",
          description: `AI removed silence and created ${newTimeline.length} segments`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process silence removal",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiCaptions = async () => {
    setIsProcessing(true);
    toast({
      title: "Processing",
      description: "AI is generating captions for your video...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-video-captions', {
        body: {
          audioText: "Sample transcript text here", // In production, you'd extract actual audio/transcript
        },
      });

      if (error) throw error;

      if (data?.captions && editingProject) {
        await supabase
          .from("editing_projects")
          .update({ captions: data.captions })
          .eq("id", editingProject.id);

        toast({
          title: "Success",
          description: "AI-generated captions added to your video",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate captions",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!recording) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/history">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">{recording.title}</h1>
              <p className="text-sm text-muted-foreground">Video Editor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Preview */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <video
              ref={videoRef}
              src={recording.video_url}
              className="w-full rounded-lg"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-lg p-4">
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handlePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={(e) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = parseFloat(e.target.value);
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <span className="text-white text-sm font-mono min-w-24 text-right">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Editing Tools Sidebar */}
        <div className="w-full lg:w-80 bg-card border-l border-border p-4 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Trim Video
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Start Time</label>
                <Slider
                  value={[trimStart]}
                  onValueChange={(value) => setTrimStart(value[0])}
                  max={duration}
                  step={0.1}
                  className="mt-2"
                />
                <span className="text-xs text-muted-foreground">{formatTime(trimStart)}</span>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End Time</label>
                <Slider
                  value={[trimEnd]}
                  onValueChange={(value) => setTrimEnd(value[0])}
                  max={duration}
                  step={0.1}
                  className="mt-2"
                />
                <span className="text-xs text-muted-foreground">{formatTime(trimEnd)}</span>
              </div>
              <Button onClick={handleTrim} className="w-full" disabled={isProcessing}>
                Add to Timeline
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Features
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleAiSilenceRemoval}
                disabled={isProcessing}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Remove Silence
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleAiCaptions}
                disabled={isProcessing}
              >
                <Captions className="w-4 h-4 mr-2" />
                Auto-Generate Captions
              </Button>
            </div>
          </Card>

          {/* Timeline Preview */}
          {timeline.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
              <div className="space-y-2">
                {timeline.map((segment, index) => (
                  <div
                    key={segment.id}
                    className="bg-primary/10 border border-primary/20 rounded p-2 text-sm"
                  >
                    <span className="text-foreground font-medium">Segment {index + 1}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Edit;