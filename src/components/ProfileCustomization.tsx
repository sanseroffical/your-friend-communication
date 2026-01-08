import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Palette } from 'lucide-react';

interface ProfileCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentTheme?: string;
  currentCardStyle?: string;
  onUpdated: () => void;
}

const PROFILE_THEMES = [
  { id: 'default', name: 'Default', gradient: 'bg-gradient-to-r from-primary/20 to-primary/10' },
  { id: 'ocean', name: 'Ocean', gradient: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/20' },
  { id: 'sunset', name: 'Sunset', gradient: 'bg-gradient-to-r from-orange-500/30 to-pink-500/20' },
  { id: 'forest', name: 'Forest', gradient: 'bg-gradient-to-r from-green-500/30 to-emerald-500/20' },
  { id: 'purple', name: 'Purple', gradient: 'bg-gradient-to-r from-purple-500/30 to-violet-500/20' },
  { id: 'dark', name: 'Dark', gradient: 'bg-gradient-to-r from-gray-800/50 to-gray-900/50' },
];

const CARD_STYLES = [
  { id: 'default', name: 'Default', classes: 'rounded-lg border bg-card' },
  { id: 'glass', name: 'Glass', classes: 'rounded-lg border bg-card/50 backdrop-blur-sm' },
  { id: 'solid', name: 'Solid', classes: 'rounded-lg border-2 border-primary bg-card' },
  { id: 'minimal', name: 'Minimal', classes: 'rounded-none border-b bg-transparent' },
  { id: 'rounded', name: 'Rounded', classes: 'rounded-3xl border bg-card shadow-lg' },
];

const ProfileCustomization = ({ 
  isOpen, 
  onClose, 
  userId, 
  currentTheme = 'default', 
  currentCardStyle = 'default',
  onUpdated 
}: ProfileCustomizationProps) => {
  const [profileTheme, setProfileTheme] = useState(currentTheme);
  const [cardStyle, setCardStyle] = useState(currentCardStyle);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setProfileTheme(currentTheme);
    setCardStyle(currentCardStyle);
  }, [currentTheme, currentCardStyle]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_theme: profileTheme,
          card_style: cardStyle,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({ title: 'Profile customization saved!' });
      onUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCardStyleClasses = (styleId: string) => {
    return CARD_STYLES.find(s => s.id === styleId)?.classes || CARD_STYLES[0].classes;
  };

  const getThemeGradient = (themeId: string) => {
    return PROFILE_THEMES.find(t => t.id === themeId)?.gradient || PROFILE_THEMES[0].gradient;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Profile Customization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className={`p-4 ${getThemeGradient(profileTheme)} rounded-lg`}>
              <div className={`${getCardStyleClasses(cardStyle)} p-4`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Your Name</p>
                    <p className="text-sm text-muted-foreground">@clip_id</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Theme */}
          <div className="space-y-3">
            <Label>Profile Theme</Label>
            <RadioGroup value={profileTheme} onValueChange={setProfileTheme} className="grid grid-cols-2 gap-2">
              {PROFILE_THEMES.map((theme) => (
                <div key={theme.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} />
                  <Label 
                    htmlFor={`theme-${theme.id}`} 
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <div className={`w-6 h-6 rounded ${theme.gradient}`} />
                    {theme.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Card Style */}
          <div className="space-y-3">
            <Label>Card Style</Label>
            <RadioGroup value={cardStyle} onValueChange={setCardStyle} className="grid grid-cols-1 gap-2">
              {CARD_STYLES.map((style) => (
                <div key={style.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={style.id} id={`card-${style.id}`} />
                  <Label 
                    htmlFor={`card-${style.id}`} 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className={`w-16 h-8 ${style.classes}`} />
                    {style.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCustomization;