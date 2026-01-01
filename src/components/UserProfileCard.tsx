import { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AdminBadge from './AdminBadge';

interface Profile {
  id: string;
  clip_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface UserProfileCardProps {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  onStartChat?: () => void;
}

const UserProfileCard = ({ userId, displayName, avatarUrl, onStartChat }: UserProfileCardProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchProfile = async () => {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setIsAdmin(rolesData.some(r => r.role === 'admin'));
        setIsModerator(rolesData.some(r => r.role === 'moderator'));
      }
    };

    fetchProfile();
  }, [userId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Avatar className="h-6 w-6">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{displayName}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={profile?.avatar_url || avatarUrl || undefined} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold">{profile?.display_name || displayName}</h3>
            {isAdmin && <AdminBadge role="admin" />}
            {isModerator && !isAdmin && <AdminBadge role="moderator" />}
          </div>

          <p className="text-sm text-muted-foreground font-mono">
            @{profile?.clip_id || 'unknown'}
          </p>

          {profile?.bio && (
            <p className="text-center text-muted-foreground mt-4 px-4">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
            <Calendar className="h-3 w-3" />
            <span>
              Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
            </span>
          </div>

          {onStartChat && (
            <Button 
              onClick={() => {
                onStartChat();
                setIsOpen(false);
              }}
              className="mt-6"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileCard;
