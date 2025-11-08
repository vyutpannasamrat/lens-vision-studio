import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MoreVertical, Crown, Edit3, Eye, Trash2 } from "lucide-react";

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface CollaboratorListProps {
  projectId: string;
  projectOwnerId: string;
  currentUserId: string;
  onUpdate: () => void;
}

export const CollaboratorList = ({
  projectId,
  projectOwnerId,
  currentUserId,
  onUpdate,
}: CollaboratorListProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [owner, setOwner] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCollaborators();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`collaborators-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_collaborators",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadCollaborators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadCollaborators = async () => {
    // Load owner
    const { data: ownerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", projectOwnerId)
      .single();

    setOwner(ownerData);

    // Load collaborators
    const { data, error } = await supabase
      .from("project_collaborators")
      .select(
        `
        id,
        user_id,
        role,
        profiles (
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("project_id", projectId);

    if (error) {
      console.error("Error loading collaborators:", error);
      return;
    }

    setCollaborators(data as any || []);
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;

      await supabase.from("project_activity").insert({
        project_id: projectId,
        user_id: currentUserId,
        action: "collaborator_removed",
        description: "Removed a collaborator",
      });

      toast({
        title: "Collaborator removed",
        description: "User has been removed from the project",
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      toast({
        title: "Failed to remove",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (collaboratorId: string, newRole: "editor" | "viewer") => {
    try {
      const { error } = await supabase
        .from("project_collaborators")
        .update({ role: newRole })
        .eq("id", collaboratorId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `Collaborator role changed to ${newRole}`,
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "editor":
        return <Edit3 className="w-3 h-3" />;
      case "viewer":
        return <Eye className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "editor":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  const isOwner = currentUserId === projectOwnerId;

  return (
    <div className="space-y-2">
      {/* Owner */}
      {owner && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white">
                  {owner.full_name?.charAt(0) || owner.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{owner.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{owner.email}</p>
              </div>
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Owner
            </Badge>
          </div>
        </Card>
      )}

      {/* Collaborators */}
      {collaborators.map((collab) => (
        <Card key={collab.id} className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-muted">
                  {collab.profiles?.full_name?.charAt(0) || collab.profiles?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {collab.profiles?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {collab.profiles?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant(collab.role)} className="flex items-center gap-1">
                {getRoleIcon(collab.role)}
                {collab.role}
              </Badge>

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleUpdateRole(collab.id, "editor")}
                      disabled={collab.role === "editor"}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Make Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateRole(collab.id, "viewer")}
                      disabled={collab.role === "viewer"}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Make Viewer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRemoveCollaborator(collab.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </Card>
      ))}

      {collaborators.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No collaborators yet. Invite team members to work together!
          </p>
        </Card>
      )}
    </div>
  );
};
