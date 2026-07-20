import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogIn, UserPlus, Copy, Check } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

const Auth = () => {
  const [mode, setMode] = useState<"choose" | "login" | "signup" | "welcome" | "forgot">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [generatedClipId, setGeneratedClipId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Same-origin relative-path safe next target (default "/")
  const nextParam = searchParams.get("next") ?? "/";
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  // Check if already logged in & listen for auth changes (e.g. OAuth redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = safeNext;
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = safeNext;
      }
    });

    return () => subscription.unsubscribe();
  }, [safeNext]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
      window.location.href = safeNext;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setResetSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}${safeNext}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (error) throw error;

      // Fetch the generated clipId from the profile
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("clip_id")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          setGeneratedClipId(profile.clip_id);
        }
      }

      setMode("welcome");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyClipId = () => {
    navigator.clipboard.writeText(generatedClipId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Your clipID has been copied to clipboard",
    });
  };

  const continueToApp = () => {
    window.location.href = safeNext;
  };

  if (mode === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to FriendChat!</CardTitle>
            <CardDescription>Your account has been created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center space-y-2">
              <p className="text-sm text-muted-foreground">Your unique clipID is:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold text-primary">{generatedClipId}</code>
                <Button variant="ghost" size="icon" onClick={copyClipId}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This is your unique identifier for sharing with friends.</p>
            </div>
            <Button onClick={continueToApp} className="w-full" size="lg">
              Continue to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMode("login"); setResetSent(false); }}
              className="w-fit -ml-2 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Button>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {resetSent 
                ? "Check your email for a reset link"
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">📧</div>
                <p className="text-muted-foreground">
                  If an account exists with that email, you'll receive a reset link shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                  />
                </div>
                <Button
                  onClick={handleForgotPassword}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">FriendChat</CardTitle>
            <CardDescription>Connect with friends securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setMode("login")}
              className="w-full"
              size="lg"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Login
            </Button>
            <Button
              onClick={() => setMode("signup")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Create new account
            </Button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}${safeNext}`,
                });
                if (error) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to sign in with Google",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("choose")}
            className="w-fit -ml-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle>{mode === "login" ? "Login" : "Create Account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your credentials to login"
              : "Create your account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto text-xs"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </Button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Username</Label>
              <Input
                id="displayName"
                placeholder="Choose a username"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              />
              <p className="text-xs text-muted-foreground">
                You'll receive a unique clipID after signup
              </p>
            </div>
          )}

          <Button
            onClick={mode === "login" ? handleLogin : handleSignup}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
