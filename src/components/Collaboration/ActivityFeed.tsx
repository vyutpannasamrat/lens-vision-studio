import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Scissors,
  UserPlus,
  UserMinus,
  Sparkles,
  MessageSquare,
  FileEdit,
  Clock,
} from "lucide-react";

interface Activity {
  id: string;
  action: string;
  description: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ActivityFeedProps {
  projectId: string;
}

export const ActivityFeed = ({ projectId }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`activity-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_activity",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("project_activity")
      .select(
        `
        id,
        action,
        description,
        created_at,
        profiles (
          full_name,
          email
        )
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading activities:", error);
      return;
    }

    setActivities(data as any || []);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "trim_added":
        return <Scissors className="w-4 h-4 text-primary" />;
      case "collaborator_added":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "collaborator_removed":
        return <UserMinus className="w-4 h-4 text-destructive" />;
      case "ai_feature":
        return <Sparkles className="w-4 h-4 text-accent-color" />;
      case "comment_added":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "project_edited":
        return <FileEdit className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Recent Activity
      </h3>

      <ScrollArea className="h-[400px] pr-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="text-xs bg-muted">
                    {activity.profiles?.full_name?.charAt(0) ||
                      activity.profiles?.email?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionIcon(activity.action)}
                    <p className="text-sm">
                      <span className="font-medium">
                        {activity.profiles?.full_name || "User"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {activity.description}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
