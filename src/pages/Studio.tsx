import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, Users, Plus, LogIn } from 'lucide-react';
import SessionCreator from '@/components/MultiCam/SessionCreator';
import SessionJoiner from '@/components/MultiCam/SessionJoiner';
import SessionControlPanel from '@/components/MultiCam/SessionControlPanel';

const Studio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'active'>('home');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [currentDevice, setCurrentDevice] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleSessionCreated = (session: any, device: any) => {
    setCurrentSession(session);
    setCurrentDevice(device);
    setMode('active');
    toast({
      title: "Session Created",
      description: `Share code: ${session.session_code}`,
    });
  };

  const handleSessionJoined = (session: any, device: any) => {
    setCurrentSession(session);
    setCurrentDevice(device);
    setMode('active');
    toast({
      title: "Joined Session",
      description: `Connected as ${device.angle_name}`,
    });
  };

  const handleLeaveSession = () => {
    setCurrentSession(null);
    setCurrentDevice(null);
    setMode('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to continue</p>
          <Button onClick={() => navigate('/auth')}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Multi-Cam Studio</h1>
          </div>
          {mode !== 'home' && (
            <Button variant="ghost" onClick={handleLeaveSession}>
              Back to Home
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {mode === 'home' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-12">
              <h2 className="text-4xl font-bold tracking-tight">
                Record from Multiple Angles Simultaneously
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Connect multiple devices to capture your content from different perspectives.
                Perfect sync, professional results.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card 
                className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => setMode('create')}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Create New Session</h3>
                  <p className="text-muted-foreground">
                    Start a new multi-camera recording session and invite other devices to join
                  </p>
                  <Button size="lg" className="w-full">
                    Get Started
                  </Button>
                </div>
              </Card>

              <Card 
                className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => setMode('join')}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Join Existing Session</h3>
                  <p className="text-muted-foreground">
                    Scan QR code or enter session code to join as an additional camera
                  </p>
                  <Button size="lg" variant="secondary" className="w-full">
                    Join Session
                  </Button>
                </div>
              </Card>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="text-3xl">🎥</div>
                <h4 className="font-semibold">Perfect Sync</h4>
                <p className="text-sm text-muted-foreground">
                  All cameras start and stop simultaneously
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl">📱</div>
                <h4 className="font-semibold">Any Device</h4>
                <p className="text-sm text-muted-foreground">
                  Use phones, tablets, or computers
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl">✨</div>
                <h4 className="font-semibold">AI Merge</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically combine angles intelligently
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <SessionCreator 
            userId={user.id} 
            onSessionCreated={handleSessionCreated}
            onCancel={() => setMode('home')}
          />
        )}

        {mode === 'join' && (
          <SessionJoiner 
            userId={user.id} 
            onSessionJoined={handleSessionJoined}
            onCancel={() => setMode('home')}
          />
        )}

        {mode === 'active' && currentSession && currentDevice && (
          <SessionControlPanel
            session={currentSession}
            device={currentDevice}
            onLeave={handleLeaveSession}
          />
        )}
      </main>
    </div>
  );
};

export default Studio;