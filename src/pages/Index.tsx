import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Sparkles, Mic, Share2, Edit3, LogOut, User, History as HistoryIcon, Users } from "lucide-react";
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
      <header className="fixed top-0 w-full z-50 border-b border-border/40 glass-card">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-primary">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">Lens Vision</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden md:inline">{session.user.email}</span>
                </div>
                <Link to="/history">
                  <Button variant="ghost" size="sm" className="hover-glow">
                    <HistoryIcon className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </Link>
                <Link to="/studio">
                  <Button variant="ghost" size="sm" className="hover-glow">
                    <Users className="w-4 h-4 mr-2" />
                    Multi-Cam
                  </Button>
                </Link>
                <Link to="/record">
                  <Button className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 btn-elevated">
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
                <Button className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 btn-elevated">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-block mb-4">
              <div className="px-4 py-2 rounded-full glass-card border border-primary/20 text-sm font-medium text-primary-glow animate-bounce-in">
                ✨ AI-Powered Video Creation
              </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter">
              <span className="block animate-fade-in">Shoot.</span>
              <span className="block text-gradient animate-fade-in" style={{ animationDelay: '0.2s' }}>Edit.</span>
              <span className="block animate-fade-in" style={{ animationDelay: '0.4s' }}>Share.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
              Record video podcasts, presentations, livestreams and reaction videos – automatically edited and ready in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <Link to="/record">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg px-8 py-6 btn-elevated animate-pulse-glow">
                  <Video className="w-5 h-5 mr-2" />
                  Start Recording Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="mt-20 relative animate-fade-up" style={{ animationDelay: '1s' }}>
            <div className="relative mx-auto max-w-sm aspect-[9/19] gradient-border rounded-[2.5rem] shadow-elevated overflow-hidden animate-float">
              <div className="absolute inset-0 bg-gradient-to-b from-card via-card to-background" />
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <Video className="w-20 h-20 text-primary relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 border-t border-border/40 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Feature 1 */}
            <div className="space-y-4 group animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-primary group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">
                Record talking videos
                <span className="block text-gradient">with ease.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Record with a teleprompter, use your own script, generate a script with AI or just get started on your own.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-4 group animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-color to-accent-glow flex items-center justify-center glow-accent group-hover:scale-110 transition-transform duration-300">
                <Edit3 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">
                Share-worthy edits
                <span className="block text-gradient-accent">with AI in a tap.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Record your video, tap once, and let Auto Edit do the rest – silence removal, zoom cuts, titles, captions, music and more.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-4 group animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-primary group-hover:scale-110 transition-transform duration-300">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">
                Start a podcast
                <span className="block text-gradient">with your device.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Shoot your podcast with a single device or invite a guest and connect a second device for multi-cam recording.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="space-y-4 group animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-color to-accent-glow flex items-center justify-center glow-accent group-hover:scale-110 transition-transform duration-300">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">
                Publish everywhere
                <span className="block text-gradient-accent">instantly.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                One-click publishing to YouTube, TikTok, Instagram, LinkedIn and more with optimized formats for each platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative gradient-border rounded-3xl p-12 overflow-hidden animate-fade-up">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent-color/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Ready to create amazing content?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Start recording professional videos in seconds with AI-powered tools.
              </p>
              <Link to="/record">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg px-8 py-6 btn-elevated animate-pulse-glow">
                  <Video className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 glass-card">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Lens Vision. AI-powered video creation platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
