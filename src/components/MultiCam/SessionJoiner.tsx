import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera } from 'lucide-react';
import QRCodeScanner from './QRCodeScanner';

interface SessionJoinerProps {
  userId: string;
  onSessionJoined: (session: any, device: any) => void;
  onCancel: () => void;
}

const SessionJoiner = ({ userId, onSessionJoined, onCancel }: SessionJoinerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [deviceName, setDeviceName] = useState('Camera Device');
  const [angleName, setAngleName] = useState('Side Angle');

  const generateDeviceId = () => {
    return `${navigator.userAgent.substring(0, 20)}-${Date.now()}`;
  };

  const handleJoin = async (code: string) => {
    if (!code || !deviceName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide session code and device name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Validate session code format
      if (!/^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
        toast({
          title: "Invalid Code",
          description: "Session code must be 6 characters",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('multi-cam-session', {
        body: {
          action: 'join',
          session_code: code.toUpperCase(),
          device_id: generateDeviceId(),
          device_name: deviceName,
          angle_name: angleName,
          connection_type: 'internet',
          capabilities: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            mediaCapabilities: {
              video: true,
              audio: true,
              maxResolution: '1920x1080',
              maxFrameRate: 60
            }
          }
        }
      });

      if (error) throw error;

      onSessionJoined(data.session, data.device);
      toast({
        title: "Success",
        description: "Joined session successfully",
      });
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeScanned = (code: string) => {
    setSessionCode(code);
    handleJoin(code);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Join Recording Session</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Connect to an existing session as an additional camera
            </p>
          </div>

          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code">Enter Code</TabsTrigger>
              <TabsTrigger value="scan">Scan QR</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionCode">Session Code</Label>
                <Input
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="text-center text-2xl tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., Side Camera"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="angleName">Angle Name</Label>
                <Input
                  id="angleName"
                  value={angleName}
                  onChange={(e) => setAngleName(e.target.value)}
                  placeholder="e.g., Wide Shot, Close-up"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleJoin(sessionCode)}
                  disabled={loading || !sessionCode.trim() || !deviceName.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Join Session
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <QRCodeScanner onCodeScanned={handleCodeScanned} />
              
              <div className="space-y-2">
                <Label htmlFor="deviceNameScan">Device Name</Label>
                <Input
                  id="deviceNameScan"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., Side Camera"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="angleNameScan">Angle Name</Label>
                <Input
                  id="angleNameScan"
                  value={angleName}
                  onChange={(e) => setAngleName(e.target.value)}
                  placeholder="e.g., Wide Shot, Close-up"
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default SessionJoiner;