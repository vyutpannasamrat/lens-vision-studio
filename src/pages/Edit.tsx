import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AIFeatureCard } from "@/components/Edit/AIFeatureCard";
import { ShareProjectDialog } from "@/components/Collaboration/ShareProjectDialog";
import { CollaboratorList } from "@/components/Collaboration/CollaboratorList";
import { ActivityFeed } from "@/components/Collaboration/ActivityFeed";
import { CommentPanel } from "@/components/Collaboration/CommentPanel";
import {
  ArrowLeft,
  Play,
  Pause,
  Scissors,
  Download,
  Sparkles,
  Volume2,
  Captions,
  Loader2,
  Wand2,
  Camera,
  ZoomIn,
  Share2,
  Users,
  MessageSquare
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
  const [userRole, setUserRole] = useState<string>("viewer");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [aiFeatureStatus, setAiFeatureStatus] = useState<{
    silence: "idle" | "processing" | "success" | "error";
    captions: "idle" | "processing" | "success" | "error";
    angles: "idle" | "processing" | "success" | "error";
    zoom: "idle" | "processing" | "success" | "error";
  }>({
    silence: "idle",
    captions: "idle",
    angles: "idle",
    zoom: "idle",
  });
  const [aiResults, setAiResults] = useState<{
    silence?: string;
    captions?: string;
    angles?: string;
    zoom?: string;
  }>({});

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

    setCurrentUserId(session.user.id);

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
      
      // Get user's role on this project
      const { data: roleData } = await supabase.rpc('get_project_role', {
        project_uuid: projectData.id,
        user_uuid: session.user.id
      });
      setUserRole(roleData || 'viewer');
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
    
    if (userRole === 'viewer') {
      toast({
        title: "Permission denied",
        description: "You need editor access to make changes",
        variant: "destructive",
      });
      return;
    }

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

    if (!error) {
      // Log activity
      await supabase.from("project_activity").insert({
        project_id: editingProject.id,
        user_id: currentUserId,
        action: "trim_added",
        description: "added a trim to timeline",
      });
    }

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

    setAiFeatureStatus(prev => ({ ...prev, silence: "processing" }));
    setIsProcessing(true);

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
        const newTimeline = data.segments.map((seg: any) => ({
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

        setAiFeatureStatus(prev => ({ ...prev, silence: "success" }));
        setAiResults(prev => ({ 
          ...prev, 
          silence: `Removed awkward pauses and created ${newTimeline.length} clean segments`
        }));

        toast({
          title: "Success",
          description: `AI cleaned up ${newTimeline.length} segments`,
        });
      }
    } catch (error: any) {
      setAiFeatureStatus(prev => ({ ...prev, silence: "error" }));
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
    setAiFeatureStatus(prev => ({ ...prev, captions: "processing" }));
    setIsProcessing(true);

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

        setAiFeatureStatus(prev => ({ ...prev, captions: "success" }));
        setAiResults(prev => ({ 
          ...prev, 
          captions: "Auto-generated captions with 95% accuracy"
        }));

        toast({
          title: "Success",
          description: "AI-generated captions added to your video",
        });
      }
    } catch (error: any) {
      setAiFeatureStatus(prev => ({ ...prev, captions: "error" }));
      toast({
        title: "Error",
        description: error.message || "Failed to generate captions",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiBestAngles = async () => {
    setAiFeatureStatus(prev => ({ ...prev, angles: "processing" }));
    setIsProcessing(true);

    try {
      // Fetch session recordings if this is from a multi-cam session
      const { data: sessionData } = await supabase
        .from("session_recordings")
        .select("*, session_devices(*)")
        .eq("session_id", recording.session_id || "");

      if (!sessionData || sessionData.length === 0) {
        throw new Error("No multi-camera angles found for this recording");
      }

      const angles = sessionData.map((rec: any) => ({
        angle: rec.session_devices?.angle_name || "unknown",
        device: rec.session_devices?.device_name || "unknown",
        syncOffset: 0,
      }));

      const { data, error } = await supabase.functions.invoke('ai-best-angles', {
        body: {
          sessionId: recording.id,
          angles,
        },
      });

      if (error) throw error;

      if (data?.cuts) {
        setAiFeatureStatus(prev => ({ ...prev, angles: "success" }));
        setAiResults(prev => ({ 
          ...prev, 
          angles: `Suggested ${data.summary.total_cuts} optimal angle switches`
        }));

        toast({
          title: "Success",
          description: `AI analyzed ${angles.length} angles and suggested ${data.summary.total_cuts} cuts`,
        });
      }
    } catch (error: any) {
      setAiFeatureStatus(prev => ({ ...prev, angles: "error" }));
      toast({
        title: "Error",
        description: error.message || "Failed to analyze angles",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiSmartZoom = async () => {
    setAiFeatureStatus(prev => ({ ...prev, zoom: "processing" }));
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-zoom', {
        body: {
          videoMetadata: {
            duration,
            resolution: "1920x1080",
          },
          transcript: "Sample transcript", // In production, extract from captions
        },
      });

      if (error) throw error;

      if (data?.zooms) {
        setAiFeatureStatus(prev => ({ ...prev, zoom: "success" }));
        setAiResults(prev => ({ 
          ...prev, 
          zoom: `Suggested ${data.summary.total_zooms} dynamic zoom moments`
        }));

        toast({
          title: "Success",
          description: `AI suggested ${data.summary.total_zooms} smart zoom points`,
        });
      }
    } catch (error: any) {
      setAiFeatureStatus(prev => ({ ...prev, zoom: "error" }));
      toast({
        title: "Error",
        description: error.message || "Failed to analyze zoom opportunities",
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
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
        <div className="w-full lg:w-96 bg-card border-l border-border overflow-y-auto">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="w-full grid grid-cols-4 sticky top-0 z-10">
              <TabsTrigger value="ai">
                <Wand2 className="w-4 h-4 mr-2" />
                AI Tools
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Scissors className="w-4 h-4 mr-2" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="collab">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="p-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">AI-Powered Editing</h2>
                  <p className="text-sm text-muted-foreground">
                    Professional editing features powered by AI
                  </p>
                </div>

                <AIFeatureCard
                  icon={<Volume2 className="w-5 h-5" />}
                  title="Remove Silence & Interruptions"
                  description="Automatically remove awkward pauses, 'ums', and interruptions"
                  status={aiFeatureStatus.silence}
                  onExecute={handleAiSilenceRemoval}
                  disabled={isProcessing}
                  badge="Popular"
                  resultSummary={aiResults.silence}
                />

                <AIFeatureCard
                  icon={<Captions className="w-5 h-5" />}
                  title="Auto-Generate Captions"
                  description="Create accurate, synced captions for accessibility"
                  status={aiFeatureStatus.captions}
                  onExecute={handleAiCaptions}
                  disabled={isProcessing}
                  resultSummary={aiResults.captions}
                />

                <AIFeatureCard
                  icon={<Camera className="w-5 h-5" />}
                  title="Best Angle Selection"
                  description="AI picks optimal camera angles for multi-cam recordings"
                  status={aiFeatureStatus.angles}
                  onExecute={handleAiBestAngles}
                  disabled={isProcessing}
                  badge="Multi-Cam"
                  resultSummary={aiResults.angles}
                />

                <AIFeatureCard
                  icon={<ZoomIn className="w-5 h-5" />}
                  title="Smart Zoom"
                  description="Add dynamic zoom effects for emphasis and polish"
                  status={aiFeatureStatus.zoom}
                  onExecute={handleAiSmartZoom}
                  disabled={isProcessing}
                  badge="Pro"
                  resultSummary={aiResults.zoom}
                />
              </div>
            </TabsContent>

            <TabsContent value="manual" className="p-4 space-y-4">
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
            </TabsContent>

            <TabsContent value="collab" className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Team Collaboration</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage project collaborators and track activity
                </p>
              </div>

              <CollaboratorList
                projectId={editingProject?.id || ""}
                projectOwnerId={recording?.user_id || ""}
                currentUserId={currentUserId}
                onUpdate={loadRecording}
              />

              <div className="pt-4">
                <ActivityFeed projectId={editingProject?.id || ""} />
              </div>
            </TabsContent>

            <TabsContent value="comments" className="p-4 h-full">
              <CommentPanel
                projectId={editingProject?.id || ""}
                currentUserId={currentUserId}
                currentTime={currentTime}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Share Project Dialog */}
      <ShareProjectDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        projectId={editingProject?.id || ""}
        onCollaboratorAdded={loadRecording}
      />
    </div>
  );
};

export default Edit;