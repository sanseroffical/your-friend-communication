import { useState } from 'react';
import { Settings, AlertTriangle, Palette, Accessibility, Sparkles, Eye, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserSettings, THEMES, FONTS, FONT_SIZES } from '@/hooks/useUserSettings';
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
  roomCode 
}: {
  settings: any;
  updateSettings: (s: any) => void;
  handleThemeChange: (id: string) => void;
  handleRoomTheme: (id: string) => void;
  roomCode?: string;
}) => (
  <Tabs defaultValue="appearance" className="mt-6">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="appearance">
        <Palette className="h-4 w-4 mr-1" />
        Theme
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
              <span className="text-sm font-mono">{settings.bonzi_chaos_level}/5</span>
            </div>
            <Slider
              value={[settings.bonzi_chaos_level]}
              min={1}
              max={5}
              step={1}
              onValueChange={([v]) => updateSettings({ bonzi_chaos_level: v })}
            />
            <p className="text-xs text-muted-foreground">
              {settings.bonzi_chaos_level === 1 && "Mild: Occasional silly messages"}
              {settings.bonzi_chaos_level === 2 && "Playful: More frequent interruptions"}
              {settings.bonzi_chaos_level === 3 && "Mischievous: Fake notifications"}
              {settings.bonzi_chaos_level === 4 && "Chaotic: Visual effects enabled"}
              {settings.bonzi_chaos_level === 5 && "MAXIMUM CHAOS: All effects!"}
            </p>
          </div>
        )}
      </div>
    </TabsContent>
  </Tabs>
);

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
