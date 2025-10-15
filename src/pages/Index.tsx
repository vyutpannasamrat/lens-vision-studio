import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Sparkles, Mic, Share2, Edit3, LogOut, User, History as HistoryIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">Lens Vision</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{session.user.email}</span>
                </div>
                <Link to="/history">
                  <Button variant="ghost" size="sm">
                    <HistoryIcon className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </Link>
                <Link to="/record">
                  <Button variant="default" className="bg-primary hover:bg-primary/90 glow-primary">
                    <Video className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="space-y-8">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
              <span className="block">Shoot.</span>
              <span className="block text-gradient">Edit.</span>
              <span className="block">Share.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Record video podcasts, presentations, livestreams and reaction videos – automatically edited and ready in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/record">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 glow-primary">
                  <Video className="w-5 h-5 mr-2" />
                  Start Recording Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="mt-20 relative">
            <div className="relative mx-auto max-w-sm aspect-[9/19] bg-card rounded-[2.5rem] border-8 border-border shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Video className="w-20 h-20 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 border-t border-border/40">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Feature 1 */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Record talking videos
                <span className="block text-primary">with ease.</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Record with a teleprompter, use your own script, generate a script with AI or just get started on your own.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Share-worthy edits
                <span className="block text-primary">with AI in a tap.</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Record your video, tap once, and let Auto Edit do the rest – silence removal, zoom cuts, titles, captions, music and more.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Start a podcast
                <span className="block text-primary">with your device.</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Shoot your podcast with a single device or invite a guest and connect a second device for multi-cam recording.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Publish everywhere
                <span className="block text-primary">instantly.</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                One-click publishing to YouTube, TikTok, Instagram, LinkedIn and more with optimized formats for each platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-12 border border-primary/20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to create amazing content?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start recording professional videos in seconds with AI-powered tools.
            </p>
            <Link to="/record">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 glow-primary">
                <Video className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Lens Vision. AI-powered video creation platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
