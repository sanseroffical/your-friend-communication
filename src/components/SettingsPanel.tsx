import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Palette, Accessibility, Sparkles, Eye, Terminal, User, Upload, Loader2, UserCircle } from 'lucide-react';
import AvatarCustomizer, { DEFAULT_CUSTOMIZATION, type AvatarCustomization } from './plaza/AvatarCustomizer';
import { useTextToSpeech, TTS_VOICES } from '@/hooks/useTextToSpeech';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserSettings, THEMES, FONTS, FONT_SIZES } from '@/hooks/useUserSettings';
import ProfileCustomization from './ProfileCustomization';
import SeasonalClock from './SeasonalClock';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  userId: string;
  roomCode?: string;
  isAdmin?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SettingsPanel = ({ userId, roomCode, isAdmin, isOpen, onOpenChange }: SettingsPanelProps) => {
  const { settings, updateSettings, setRoomThemeForAll } = useUserSettings(userId);
  const [showStrobeWarning, setShowStrobeWarning] = useState(false);

  const handleThemeChange = (themeId: string) => {
    if (themeId === 'strobe') {
      setShowStrobeWarning(true);
      return;
    }
    updateSettings({ theme: themeId });
  };

  const confirmStrobeTheme = () => {
    updateSettings({ theme: 'strobe' });
    setShowStrobeWarning(false);
  };

  const handleRoomTheme = (themeId: string) => {
    if (roomCode) {
      setRoomThemeForAll(roomCode, themeId, userId);
    }
  };

  // Controlled mode (no trigger, just content)
  if (isOpen !== undefined && onOpenChange) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Customize your chat experience</SheetDescription>
            </SheetHeader>
            <SettingsContent 
              settings={settings}
              updateSettings={updateSettings}
              handleThemeChange={handleThemeChange}
              handleRoomTheme={handleRoomTheme}
              roomCode={roomCode}
              userId={userId}
              isAdmin={isAdmin}
            />
          </SheetContent>
        </Sheet>
        {showStrobeWarning && (
          <StrobeWarningModal 
            onCancel={() => setShowStrobeWarning(false)} 
            onConfirm={confirmStrobeTheme} 
          />
        )}
      </>
    );
  }

  // Uncontrolled mode (with trigger button)
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Customize your chat experience</SheetDescription>
          </SheetHeader>
          <SettingsContent 
            settings={settings}
            updateSettings={updateSettings}
            handleThemeChange={handleThemeChange}
            handleRoomTheme={handleRoomTheme}
            roomCode={roomCode}
            userId={userId}
            isAdmin={isAdmin}
          />
        </SheetContent>
      </Sheet>
      {showStrobeWarning && (
        <StrobeWarningModal 
          onCancel={() => setShowStrobeWarning(false)} 
          onConfirm={confirmStrobeTheme} 
        />
      )}
    </>
  );
};

// Extracted content component
const SettingsContent = ({ 
  settings, 
  updateSettings, 
  handleThemeChange, 
  handleRoomTheme, 
  roomCode,
  userId,
  isAdmin,
}: {
  settings: any;
  updateSettings: (s: any) => void;
  handleThemeChange: (id: string) => void;
  handleRoomTheme: (id: string) => void;
  roomCode?: string;
  userId: string;
  isAdmin?: boolean;
}) => {
  const [showProfileCustomization, setShowProfileCustomization] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [avatarCustomization, setAvatarCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
  const [profile, setProfile] = useState<{
    display_name: string;
    bio: string;
    avatar_url: string;
    profile_theme: string;
    card_style: string;
  }>({ display_name: '', bio: '', avatar_url: '', profile_theme: 'default', card_style: 'default' });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Fetch profile data
  useEffect(() => {
    if (!userId) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, profile_theme, card_style, avatar_customization')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile({
          display_name: data.display_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          profile_theme: data.profile_theme || 'default',
          card_style: data.card_style || 'default',
        });
        if (data.avatar_customization) {
          setAvatarCustomization({ ...DEFAULT_CUSTOMIZATION, ...(data.avatar_customization as any) });
        }
      }
    };
    
    fetchProfile();
  }, [userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Save immediately
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      toast({ title: 'Avatar updated!' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!profile.display_name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a display name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name.trim(),
          bio: profile.bio.trim() || null,
        })
        .eq('id', userId);

      if (error) throw error;
      toast({ title: 'Profile saved!' });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Tabs defaultValue="appearance" className="mt-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-1" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-1" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="avatar">
            <UserCircle className="h-4 w-4 mr-1" />
            Avatar
          </TabsTrigger>
          <TabsTrigger value="accessibility">
            <Accessibility className="h-4 w-4 mr-1" />
            Access
          </TabsTrigger>
          <TabsTrigger value="fun">
            <Sparkles className="h-4 w-4 mr-1" />
            Fun
          </TabsTrigger>
        </TabsList>

    <TabsContent value="appearance" className="space-y-6 mt-4">
      <div className="space-y-3">
        <Label className="text-base font-medium">Personal Theme</Label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-all",
                settings.theme === theme.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-sm font-medium">{theme.name}</span>
              {theme.warning && (
                <AlertTriangle className="h-3 w-3 text-yellow-500 inline ml-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Seasonal Clock - only show when seasonal theme is active */}
      {settings.theme === 'seasonal' && (
        <SeasonalClock className="mt-4" />
      )}

      {roomCode && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Set Room Theme (for everyone)</Label>
          <Select onValueChange={handleRoomTheme}>
            <SelectTrigger>
              <SelectValue placeholder="Select a theme for the room" />
            </SelectTrigger>
            <SelectContent>
              {THEMES.filter(t => t.id !== 'strobe').map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-base font-medium">Font</Label>
        <Select 
          value={settings.font_family} 
          onValueChange={(v) => updateSettings({ font_family: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Font Size</Label>
        <Select 
          value={settings.font_size} 
          onValueChange={(v) => updateSettings({ font_size: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.id} value={size.id}>
                {size.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TabsContent>

    <TabsContent value="profile" className="space-y-6 mt-4">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {profile.display_name.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            id="settings-avatar-upload"
            disabled={isUploading}
          />
          <Label htmlFor="settings-avatar-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={isUploading}>
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Change Avatar
              </span>
            </Button>
          </Label>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="settings-display-name">Display Name</Label>
        <Input
          id="settings-display-name"
          value={profile.display_name}
          onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
          placeholder="Your display name"
          maxLength={50}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="settings-bio">Bio</Label>
        <Textarea
          id="settings-bio"
          value={profile.bio}
          onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="Tell others about yourself..."
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">{profile.bio.length}/200</p>
      </div>

      <Button onClick={handleProfileSave} disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Profile
      </Button>

      {/* Profile Customization */}
      <div className="pt-4 border-t space-y-3">
        <div>
          <Label className="text-base font-medium">Profile Theme & Card Style</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how your profile appears to others.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => setShowProfileCustomization(true)}
        >
          <Palette className="h-4 w-4" />
          Open Theme Customization
        </Button>
      </div>
    </TabsContent>

    <TabsContent value="avatar" className="space-y-4 mt-4">
      <div>
        <Label className="text-base font-medium">Plaza 3D Avatar</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the character that represents you in the 3D Plaza — body, head, accessories and effects.
        </p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: avatarCustomization.bodyColor }} />
            <span className="text-muted-foreground">Skin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: avatarCustomization.shirtColor }} />
            <span className="text-muted-foreground">Shirt</span>
          </div>
          <div className="text-muted-foreground">Hat: <span className="text-foreground capitalize">{avatarCustomization.hatStyle}</span></div>
          <div className="text-muted-foreground">Glasses: <span className="text-foreground capitalize">{avatarCustomization.glassesStyle}</span></div>
        </div>
      </div>
      <Button className="w-full gap-2" onClick={() => setShowAvatarCustomizer(true)}>
        <UserCircle className="h-4 w-4" />
        Open Avatar Customizer
      </Button>
    </TabsContent>

    <TabsContent value="accessibility" className="space-y-6 mt-4">
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          Some settings are automatically detected from your device preferences.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Reduce Motion</Label>
            <p className="text-sm text-muted-foreground">Minimize animations</p>
          </div>
          <Switch
            checked={settings.reduce_motion}
            onCheckedChange={(v) => updateSettings({ reduce_motion: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">High Contrast</Label>
            <p className="text-sm text-muted-foreground">Increase color contrast</p>
          </div>
          <Switch
            checked={settings.high_contrast}
            onCheckedChange={(v) => updateSettings({ high_contrast: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Screen Reader Mode</Label>
            <p className="text-sm text-muted-foreground">Optimize for screen readers</p>
          </div>
          <Switch
            checked={settings.screen_reader_mode}
            onCheckedChange={(v) => updateSettings({ screen_reader_mode: v })}
          />
        </div>

        <ReadAloudSettings enabled={settings.screen_reader_mode} />
      </div>
    </TabsContent>

    <TabsContent value="fun" className="space-y-6 mt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Command Prompt Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Terminal-style chat interface
            </p>
          </div>
          <Switch
            checked={settings.command_prompt_mode}
            onCheckedChange={(v) => updateSettings({ command_prompt_mode: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Enable Bonzi Buddy</Label>
            <p className="text-sm text-muted-foreground">
              A helpful friend who may cause... chaos (Clippy's rival!)
            </p>
          </div>
          <Switch
            checked={settings.bonzi_enabled}
            onCheckedChange={(v) => updateSettings({ bonzi_enabled: v })}
          />
        </div>

        {settings.bonzi_enabled && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base">Chaos Level</Label>
              <span className="text-sm font-mono">
                {settings.bonzi_chaos_level}/{isAdmin ? '6' : '5'}
                {settings.bonzi_chaos_level === 6 && ' 🔥'}
              </span>
            </div>
            <Slider
              value={[settings.bonzi_chaos_level]}
              min={1}
              max={isAdmin ? 6 : 5}
              step={1}
              onValueChange={([v]) => updateSettings({ bonzi_chaos_level: v })}
            />
            <p className="text-xs text-muted-foreground">
              {settings.bonzi_chaos_level === 1 && "Mild: Occasional silly messages"}
              {settings.bonzi_chaos_level === 2 && "Playful: More frequent interruptions"}
              {settings.bonzi_chaos_level === 3 && "Mischievous: Fake notifications"}
              {settings.bonzi_chaos_level === 4 && "Chaotic: Visual effects enabled"}
              {settings.bonzi_chaos_level === 5 && "MAXIMUM CHAOS: All effects!"}
              {settings.bonzi_chaos_level === 6 && "🔥 ADMIN ULTRA MODE: Rainbow & spin effects!"}
            </p>
            {isAdmin && settings.bonzi_chaos_level < 6 && (
              <p className="text-xs text-primary">
                🔓 Admin privilege: Level 6 unlocked!
              </p>
            )}
          </div>
        )}
      </div>
    </TabsContent>
  </Tabs>

  {userId && (
    <ProfileCustomization
      isOpen={showProfileCustomization}
      onClose={() => setShowProfileCustomization(false)}
      userId={userId}
      currentTheme={profile.profile_theme}
      currentCardStyle={profile.card_style}
      onUpdated={() => {
        // Refresh profile after customization update
        supabase
          .from('profiles')
          .select('display_name, bio, avatar_url, profile_theme, card_style')
          .eq('id', userId)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile({
                display_name: data.display_name || '',
                bio: data.bio || '',
                avatar_url: data.avatar_url || '',
                profile_theme: data.profile_theme || 'default',
                card_style: data.card_style || 'default',
              });
            }
          });
      }}
    />
  )}

  {userId && (
    <AvatarCustomizer
      isOpen={showAvatarCustomizer}
      onClose={() => setShowAvatarCustomizer(false)}
      userId={userId}
      currentCustomization={avatarCustomization}
      onSave={(c) => setAvatarCustomization(c)}
    />
  )}
</>
  );
};

const StrobeWarningModal = ({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) => (
  <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
    <div className="bg-card p-6 rounded-lg max-w-sm mx-4 border border-border">
      <div className="flex items-center gap-2 text-yellow-500 mb-4">
        <AlertTriangle className="h-6 w-6" />
        <h3 className="font-semibold text-lg">Photosensitivity Warning</h3>
      </div>
      <p className="text-muted-foreground mb-4">
        The strobe theme contains rapidly flashing lights that may cause discomfort or seizures in people with photosensitive epilepsy.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          I understand, continue
        </Button>
      </div>
    </div>
  </div>
);

export default SettingsPanel;
