import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogIn, UserPlus, Copy, Check } from "lucide-react";

const generateClipId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Auth = () => {
  const [mode, setMode] = useState<"choose" | "login" | "signup" | "welcome">("choose");
  const [clipId, setClipId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [generatedClipId, setGeneratedClipId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!clipId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your clipID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("clip_id", clipId.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        toast({
          title: "Not found",
          description: "No account found with that clipID",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("clipUser", JSON.stringify(user));
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.display_name || user.clip_id}`,
      });
      navigate("/");
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

  const handleSignup = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (displayName.trim().length < 2) {
      toast({
        title: "Error",
        description: "Username must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let newClipId = generateClipId();
      
      // Ensure uniqueness
      let exists = true;
      while (exists) {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("clip_id", newClipId)
          .maybeSingle();
        
        if (!existing) {
          exists = false;
        } else {
          newClipId = generateClipId();
        }
      }

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          clip_id: newClipId,
          display_name: displayName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("clipUser", JSON.stringify(newUser));
      setGeneratedClipId(newClipId);
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
    navigate("/");
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
              <p className="text-xs text-muted-foreground">Save this! You'll need it to log back in.</p>
            </div>
            <Button onClick={continueToApp} className="w-full" size="lg">
              Continue to Chat
            </Button>
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
            <CardDescription>Connect with friends using your clipID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setMode("login")}
              className="w-full"
              size="lg"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Login with clipID
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
              ? "Enter your clipID to login"
              : "Choose a username to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "login" ? (
            <div className="space-y-2">
              <Label htmlFor="clipId">clipID</Label>
              <Input
                id="clipId"
                placeholder="Enter your clipID"
                value={clipId}
                onChange={(e) => setClipId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          ) : (
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
