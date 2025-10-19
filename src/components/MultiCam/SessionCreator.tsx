import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';

interface SessionCreatorProps {
  userId: string;
  onSessionCreated: (session: any, device: any) => void;
  onCancel: () => void;
}

const SessionCreator = ({ userId, onSessionCreated, onCancel }: SessionCreatorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deviceName, setDeviceName] = useState('Master Device');
  const [session, setSession] = useState<any>(null);

  const generateDeviceId = () => {
    return `${navigator.userAgent.substring(0, 20)}-${Date.now()}`;
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('multi-cam-session', {
        body: {
          action: 'create',
          device_id: generateDeviceId(),
          device_name: deviceName,
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

      setSession(data.session);
      onSessionCreated(data.session, data.device);
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold">Session Created!</h2>
            <QRCodeGenerator sessionCode={session.session_code} />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Share this code with other devices:
              </p>
              <div className="text-4xl font-bold tracking-wider">
                {session.session_code}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Create Recording Session</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Set up your master device to control the recording
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., Main Camera"
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
                onClick={handleCreate}
                disabled={loading || !deviceName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Session'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SessionCreator;