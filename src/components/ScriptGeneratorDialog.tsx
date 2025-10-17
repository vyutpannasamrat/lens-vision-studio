import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScriptGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScriptGenerated: (script: string, scriptId: string) => void;
}

const ScriptGeneratorDialog = ({ open, onOpenChange, onScriptGenerated }: ScriptGeneratorDialogProps) => {
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("podcast");
  const [duration, setDuration] = useState("2-3");
  const [tone, setTone] = useState("conversational");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a topic or prompt for your script",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          prompt: prompt.trim(),
          contentType,
          duration: `${duration} minutes`,
          tone,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedScript = data.script;

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      let scriptId = "";
      
      if (user) {
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .insert({
            user_id: user.id,
            title: prompt.slice(0, 100),
            content: generatedScript,
            prompt,
          })
          .select()
          .single();
        
        if (scriptError) throw scriptError;
        scriptId = scriptData.id;
      }

      onScriptGenerated(generatedScript, scriptId);
      onOpenChange(false);
      setPrompt("");

      toast({
        title: "Script generated!",
        description: "Your script has been loaded into the teleprompter",
      });
    } catch (error) {
      console.error("Script generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate script",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Script Generator
          </DialogTitle>
          <DialogDescription>
            Tell us what you want to talk about, and AI will generate a professional script for you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Topic or Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Example: The benefits of morning meditation for productivity"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none bg-background/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="content-type" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="2-3">2-3 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptGeneratorDialog;
