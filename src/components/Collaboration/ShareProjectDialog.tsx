import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2 } from "lucide-react";

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCollaboratorAdded: () => void;
}

export const ShareProjectDialog = ({
  open,
  onOpenChange,
  projectId,
  onCollaboratorAdded,
}: ShareProjectDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Find user by email in profiles
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (profileError || !userProfile) {
        toast({
          title: "User not found",
          description: "No user found with that email address. They need to sign up first.",
          variant: "destructive",
        });
        return;
      }

      // Check if already a collaborator
      const { data: existing } = await supabase
        .from("project_collaborators")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userProfile.id)
        .single();

      if (existing) {
        toast({
          title: "Already a collaborator",
          description: "This user is already a collaborator on this project",
          variant: "destructive",
        });
        return;
      }

      // Add collaborator
      const { error: addError } = await supabase
        .from("project_collaborators")
        .insert({
          project_id: projectId,
          user_id: userProfile.id,
          role: role,
          invited_by: session.user.id,
          accepted_at: new Date().toISOString(), // Auto-accept for now
        });

      if (addError) throw addError;

      // Log activity
      await supabase.from("project_activity").insert({
        project_id: projectId,
        user_id: session.user.id,
        action: "collaborator_added",
        description: `Added ${email} as ${role}`,
      });

      toast({
        title: "Collaborator added",
        description: `${email} has been added as ${role}`,
      });

      setEmail("");
      setRole("editor");
      onCollaboratorAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error inviting collaborator:", error);
      toast({
        title: "Failed to invite",
        description: error.message || "Could not add collaborator",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Invite collaborators to work on this video project together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">
                  <div>
                    <div className="font-medium">Editor</div>
                    <div className="text-xs text-muted-foreground">
                      Can edit timeline, add effects, and export
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div>
                    <div className="font-medium">Viewer</div>
                    <div className="text-xs text-muted-foreground">
                      Can only view and comment
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
