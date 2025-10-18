import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera } from 'lucide-react';

interface QRCodeScannerProps {
  onCodeScanned: (code: string) => void;
}

const QRCodeScanner = ({ onCodeScanned }: QRCodeScannerProps) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader';

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract session code from URL or use directly
          const match = decodedText.match(/code=([A-Z0-9]{6})/i);
          const code = match ? match[1] : decodedText;
          
          if (code.length === 6) {
            scanner.stop();
            onCodeScanned(code.toUpperCase());
            setIsScanning(false);
          }
        },
        () => {
          // Scan error - ignore, happens frequently
        }
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div 
        id={elementId} 
        className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
      />
      
      {!isScanning ? (
        <Button onClick={startScanning} className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Start Camera
        </Button>
      ) : (
        <Button onClick={stopScanning} variant="secondary" className="w-full">
          Stop Scanning
        </Button>
      )}
    </div>
  );
};

export default QRCodeScanner;