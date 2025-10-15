import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Mail, Lock, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (!fullName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter your full name",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent-color/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
      
      {/* Enhanced Vine Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left Vine */}
        <svg className="absolute top-0 left-0 w-80 h-80 text-primary/20 animate-fade-in" viewBox="0 0 200 200">
          <path d="M10,100 Q30,40 60,60 Q90,80 120,50 T190,70" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="50" r="4" fill="currentColor" className="animate-pulse" />
          <circle cx="60" cy="60" r="3.5" fill="currentColor" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          <circle cx="90" cy="65" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
          <circle cx="120" cy="50" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
          <circle cx="160" cy="60" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '2s' }} />
        </svg>
        
        {/* Top Right Vine */}
        <svg className="absolute top-10 right-0 w-96 h-96 text-accent-color/15 animate-fade-in" style={{ animationDelay: '0.5s' }} viewBox="0 0 200 200">
          <path d="M190,40 Q170,70 140,55 Q110,40 80,70 T20,90" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="170" cy="60" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
          <circle cx="140" cy="55" r="3.5" fill="currentColor" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
          <circle cx="110" cy="50" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.3s' }} />
          <circle cx="80" cy="70" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.8s' }} />
        </svg>

        {/* Bottom Left Vine */}
        <svg className="absolute bottom-0 left-10 w-96 h-96 text-primary-glow/15 animate-fade-in" style={{ animationDelay: '1s' }} viewBox="0 0 200 200">
          <path d="M10,150 Q40,110 70,130 Q100,150 130,120 T190,140" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="120" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
          <circle cx="70" cy="130" r="3.5" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
          <circle cx="100" cy="135" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.7s' }} />
          <circle cx="130" cy="120" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '2.2s' }} />
        </svg>

        {/* Bottom Right Vine */}
        <svg className="absolute bottom-10 right-0 w-80 h-80 text-accent-glow/15 animate-fade-in" style={{ animationDelay: '1.5s' }} viewBox="0 0 200 200">
          <path d="M190,130 Q160,100 130,120 Q100,140 70,110 T10,130" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="160" cy="110" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          <circle cx="130" cy="120" r="3.5" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1s' }} />
          <circle cx="100" cy="125" r="3" fill="currentColor" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
          <circle cx="70" cy="110" r="4" fill="currentColor" className="animate-pulse" style={{ animationDelay: '2s' }} />
        </svg>
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-md glass-card border-primary/20 shadow-elevated relative z-10 animate-scale-in overflow-hidden">
        {/* Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent-color to-primary-glow" />
        
        <div className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse-glow" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent-color flex items-center justify-center shadow-lg">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-gradient mt-4">Lens Vision</h1>
            <p className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI-Powered Video Creation
            </p>
          </div>

          {/* Auth Tabs */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 glass-card p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-glow">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-glow">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="animate-fade-in">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-card border-primary/20 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-card border-primary/20 focus:border-primary transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary via-primary-glow to-accent-color hover:opacity-90 transition-all btn-elevated mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="glass-card border-primary/20 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-card border-primary/20 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="glass-card border-primary/20 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary via-primary-glow to-accent-color hover:opacity-90 transition-all btn-elevated mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Feature Highlights */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <Sparkles className="w-5 h-5 text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">AI Scripts</p>
              </div>
              <div className="space-y-1">
                <Video className="w-5 h-5 text-accent-color mx-auto" />
                <p className="text-xs text-muted-foreground">Pro Recording</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
