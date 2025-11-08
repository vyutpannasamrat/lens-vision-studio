import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Send,
  Trash2,
  Check,
  Clock,
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  timestamp_seconds: number | null;
  resolved: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  user_id: string;
}

interface CommentPanelProps {
  projectId: string;
  currentUserId: string;
  currentTime?: number;
}

export const CommentPanel = ({
  projectId,
  currentUserId,
  currentTime = 0,
}: CommentPanelProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_comments",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("project_comments")
      .select(
        `
        id,
        content,
        timestamp_seconds,
        resolved,
        created_at,
        user_id,
        profiles (
          full_name,
          email
        )
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }

    setComments(data as any || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        user_id: currentUserId,
        content: newComment.trim(),
        timestamp_seconds: currentTime > 0 ? currentTime : null,
      });

      if (error) throw error;

      // Log activity
      await supabase.from("project_activity").insert({
        project_id: projectId,
        user_id: currentUserId,
        action: "comment_added",
        description: "added a comment",
      });

      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("project_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "Comment has been removed",
      });
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleResolved = async (commentId: string, resolved: boolean) => {
    try {
      const { error } = await supabase
        .from("project_comments")
        .update({ resolved: !resolved })
        .eq("id", commentId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error toggling resolved:", error);
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Comments ({comments.length})
      </h3>

      {/* Comment Input */}
      <div className="space-y-2 mb-4">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-between items-center">
          {currentTime > 0 && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(currentTime)}
            </Badge>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Post
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Start a discussion!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card
                key={comment.id}
                className={`p-3 ${
                  comment.resolved ? "opacity-60 bg-muted/50" : ""
                }`}
              >
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="text-xs bg-muted">
                      {comment.profiles?.full_name?.charAt(0) ||
                        comment.profiles?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {comment.profiles?.full_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                          {comment.timestamp_seconds !== null && (
                            <> • {formatTime(comment.timestamp_seconds)}</>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleToggleResolved(comment.id, comment.resolved)
                          }
                        >
                          <Check
                            className={`w-4 h-4 ${
                              comment.resolved
                                ? "text-green-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                        {comment.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm">{comment.content}</p>

                    {comment.resolved && (
                      <Badge variant="secondary" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
