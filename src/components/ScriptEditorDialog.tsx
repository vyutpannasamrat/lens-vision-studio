import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScriptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScript: string;
  scriptId: string | null;
  onScriptUpdated: (script: string, scriptId: string) => void;
}

const ScriptEditorDialog = ({ 
  open, 
  onOpenChange, 
  currentScript, 
  scriptId,
  onScriptUpdated 
}: ScriptEditorDialogProps) => {
  const [scriptText, setScriptText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setScriptText(currentScript);
      setAiPrompt("");
    }
  }, [open, currentScript]);

  const handleSave = async () => {
    if (!scriptText.trim()) {
      toast({
        title: "Script is empty",
        description: "Please add some content to your script",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalScriptId = scriptId;

      if (scriptId) {
        // Update existing script
        const { error } = await supabase
          .from("scripts")
          .update({ content: scriptText })
          .eq("id", scriptId);

        if (error) throw error;
      } else {
        // Create new script
        const { data, error } = await supabase
          .from("scripts")
          .insert({
            user_id: user.id,
            title: scriptText.slice(0, 100),
            content: scriptText,
            prompt: "Manual entry",
          })
          .select()
          .single();

        if (error) throw error;
        finalScriptId = data.id;
      }

      onScriptUpdated(scriptText, finalScriptId!);
      onOpenChange(false);

      toast({
        title: "Script saved!",
        description: "Your script has been updated",
      });
    } catch (error) {
      console.error("Script save error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save script",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe what changes you want to make",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("edit-script", {
        body: {
          currentScript: scriptText,
          editPrompt: aiPrompt.trim(),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScriptText(data.script);
      setAiPrompt("");

      toast({
        title: "Script updated!",
        description: "AI has modified your script",
      });
    } catch (error) {
      console.error("AI edit error:", error);
      toast({
        title: "AI edit failed",
        description: error instanceof Error ? error.message : "Failed to edit script with AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6 text-primary" />
            Script Editor
          </DialogTitle>
          <DialogDescription>
            Write your own script or use AI to modify it
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Edit</TabsTrigger>
            <TabsTrigger value="ai">AI Edit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="script-text">Your Script</Label>
              <Textarea
                id="script-text"
                placeholder="Type or paste your script here..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={12}
                className="resize-none bg-background/50 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {scriptText.split(/\s+/).filter(w => w).length} words • {Math.ceil(scriptText.split(/\s+/).filter(w => w).length / 150)} min read
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Script
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="current-preview">Current Script</Label>
              <Textarea
                id="current-preview"
                value={scriptText}
                rows={6}
                className="resize-none bg-muted/50 font-mono"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-prompt">What changes do you want?</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Example: Make it more enthusiastic and add a joke at the beginning"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="resize-none bg-background/50"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAiEdit}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply AI Edits
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isProcessing}
                variant="secondary"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptEditorDialog;
