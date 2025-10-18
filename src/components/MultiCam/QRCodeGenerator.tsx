import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  sessionCode: string;
}

const QRCodeGenerator = ({ sessionCode }: QRCodeGeneratorProps) => {
  const { toast } = useToast();
  const joinUrl = `${window.location.origin}/studio?code=${sessionCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      toast({
        title: "Copied!",
        description: "Session code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Multi-Cam Session',
          text: `Join my recording session with code: ${sessionCode}`,
          url: joinUrl,
        });
      } else {
        await navigator.clipboard.writeText(joinUrl);
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-6 rounded-lg">
        <QRCodeSVG 
          value={joinUrl}
          size={200}
          level="H"
          includeMargin
        />
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Code
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default QRCodeGenerator;