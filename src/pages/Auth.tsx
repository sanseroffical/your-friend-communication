import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState<"choose" | "login" | "signup">("choose");
  const [clipId, setClipId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

      // Store user in localStorage
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
    if (!clipId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a clipID",
        variant: "destructive",
      });
      return;
    }

    if (clipId.trim().length < 3) {
      toast({
        title: "Error",
        description: "clipID must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if clipID already exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("clip_id", clipId.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already taken",
          description: "This clipID is already in use",
          variant: "destructive",
        });
        return;
      }

      // Create new user
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          clip_id: clipId.trim().toLowerCase(),
          display_name: displayName.trim() || clipId.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Store user in localStorage
      localStorage.setItem("clipUser", JSON.stringify(newUser));
      toast({
        title: "Account created!",
        description: `Welcome, ${newUser.display_name}!`,
      });
      navigate("/");
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
              : "Choose a unique clipID for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clipId">clipID</Label>
            <Input
              id="clipId"
              placeholder="Enter your clipID"
              value={clipId}
              onChange={(e) => setClipId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                placeholder="How others will see you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              />
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
