import { useState } from 'react';
import { Upload, Loader2, Image, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStorageRef } from '@/hooks/useSignedStorageUrl';

interface GifAvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  currentGifUrl?: string;
  displayName: string;
  onUpdate: (avatarUrl: string, gifUrl: string | null) => void;
}

const GifAvatarUpload = ({
  userId,
  currentAvatarUrl,
  currentGifUrl,
  displayName,
  onUpdate
}: GifAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [gifUrl, setGifUrl] = useState(currentGifUrl || '');
  const [previewUrl, setPreviewUrl] = useState(currentGifUrl || currentAvatarUrl || '');
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGif: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = isGif 
      ? ['image/gif'] 
      : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: isGif ? 'Please upload a GIF file' : 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB for GIFs, 2MB for images)
    const maxSize = isGif ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Maximum size is ${isGif ? '5MB' : '2MB'}`,
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${isGif ? 'gif-avatar' : 'avatar'}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Add cache buster
      const urlWithCacheBuster = `${getStorageRef('chat-attachments', fileName)}?t=${Date.now()}`;

      if (isGif) {
        await supabase.from('profiles').update({ gif_avatar_url: urlWithCacheBuster }).eq('id', userId);
        onUpdate(currentAvatarUrl || '', urlWithCacheBuster);
      } else {
        await supabase.from('profiles').update({ avatar_url: urlWithCacheBuster }).eq('id', userId);
        onUpdate(urlWithCacheBuster, currentGifUrl || null);
      }

      setPreviewUrl(urlWithCacheBuster);
      toast({ title: isGif ? 'GIF avatar uploaded!' : 'Avatar uploaded!' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGifUrlSubmit = async () => {
    if (!gifUrl.trim()) return;

    // Validate it looks like a GIF URL
    if (!gifUrl.toLowerCase().includes('.gif')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a URL to a GIF image',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      await supabase.from('profiles').update({ gif_avatar_url: gifUrl }).eq('id', userId);
      onUpdate(currentAvatarUrl || '', gifUrl);
      setPreviewUrl(gifUrl);
      toast({ title: 'GIF avatar set!' });
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearGifAvatar = async () => {
    setIsUploading(true);
    try {
      await supabase.from('profiles').update({ gif_avatar_url: null }).eq('id', userId);
      onUpdate(currentAvatarUrl || '', null);
      setGifUrl('');
      setPreviewUrl(currentAvatarUrl || '');
      toast({ title: 'GIF avatar removed' });
    } catch (error: any) {
      toast({
        title: 'Failed to remove',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-24 w-24 ring-2 ring-primary/20">
          <AvatarImage src={previewUrl} className="object-cover" />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {displayName.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <p className="text-xs text-muted-foreground">
          {currentGifUrl ? 'Using GIF avatar' : 'Using static avatar'}
        </p>
      </div>

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="gap-1">
            <Image className="h-3 w-3" />
            Image
          </TabsTrigger>
          <TabsTrigger value="gif" className="gap-1">
            <Film className="h-3 w-3" />
            GIF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-3 mt-4">
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, false)}
              className="hidden"
              id="avatar-upload"
              disabled={isUploading}
            />
            <Label htmlFor="avatar-upload" className="cursor-pointer w-full block">
              <Button variant="outline" className="w-full" asChild disabled={isUploading}>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </span>
              </Button>
            </Label>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG, WebP or GIF up to 2MB
          </p>
        </TabsContent>

        <TabsContent value="gif" className="space-y-3 mt-4">
          {/* Upload GIF file */}
          <div>
            <Input
              type="file"
              accept="image/gif"
              onChange={(e) => handleFileUpload(e, true)}
              className="hidden"
              id="gif-upload"
              disabled={isUploading}
            />
            <Label htmlFor="gif-upload" className="cursor-pointer w-full block">
              <Button variant="outline" className="w-full" asChild disabled={isUploading}>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload GIF File
                </span>
              </Button>
            </Label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* GIF URL input */}
          <div className="space-y-2">
            <Label htmlFor="gif-url">GIF URL</Label>
            <div className="flex gap-2">
              <Input
                id="gif-url"
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="https://example.com/avatar.gif"
                disabled={isUploading}
              />
              <Button
                onClick={handleGifUrlSubmit}
                disabled={!gifUrl.trim() || isUploading}
                size="icon"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓'}
              </Button>
            </div>
          </div>

          {currentGifUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearGifAvatar}
              disabled={isUploading}
              className="w-full text-muted-foreground"
            >
              Remove GIF avatar
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            GIF files up to 5MB or paste a GIF URL
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GifAvatarUpload;
