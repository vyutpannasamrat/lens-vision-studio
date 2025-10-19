import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AIFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "idle" | "processing" | "success" | "error";
  onExecute: () => void;
  disabled?: boolean;
  badge?: string;
  resultSummary?: string;
}

export const AIFeatureCard = ({
  icon,
  title,
  description,
  status,
  onExecute,
  disabled = false,
  badge,
  resultSummary,
}: AIFeatureCardProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>

        {resultSummary && status === "success" && (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">{resultSummary}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">Processing failed. Please try again.</p>
          </div>
        )}

        <Button
          onClick={onExecute}
          disabled={disabled || status === "processing"}
          className="w-full"
          variant={status === "success" ? "outline" : "default"}
        >
          {status === "processing" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Reprocess
            </>
          ) : (
            "Apply AI"
          )}
        </Button>
      </div>
    </Card>
  );
};
