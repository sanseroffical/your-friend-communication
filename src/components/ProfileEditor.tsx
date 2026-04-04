import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Palette, Tv } from 'lucide-react';
import ProfileCustomization from './ProfileCustomization';

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    display_name: string | null;
    clip_id: string;
    avatar_url?: string | null;
    bio?: string | null;
    profile_theme?: string | null;
    card_style?: string | null;
  };
  onProfileUpdated: () => void;
}

const ProfileEditor = ({ isOpen, onClose, profile, onProfileUpdated }: ProfileEditorProps) => {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [twitchUsername, setTwitchUsername] = useState((profile as any).twitch_username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const { toast } = useToast();

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
      const fileName = `${profile.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast({ title: 'Avatar uploaded' });
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

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a display name',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const trimmedTwitch = twitchUsername.trim().replace(/^@/, '');
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          twitch_username: trimmedTwitch || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({ title: 'Profile updated' });
      onProfileUpdated();
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {displayName.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={isUploading}
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Avatar
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clip-id">Clip ID</Label>
            <Input id="clip-id" value={profile.clip_id} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Your unique identifier (cannot be changed)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/200</p>
          </div>

          <div className="pt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCustomizationOpen(true)}
              className="w-full gap-2"
            >
              <Palette className="h-4 w-4" />
              Customize Profile Theme & Card Style
            </Button>
          </div>
        </div>

        <ProfileCustomization
          isOpen={isCustomizationOpen}
          onClose={() => setIsCustomizationOpen(false)}
          userId={profile.id}
          currentTheme={profile.profile_theme || 'default'}
          currentCardStyle={profile.card_style || 'default'}
          onUpdated={onProfileUpdated}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditor;
