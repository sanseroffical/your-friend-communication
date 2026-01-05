import { useState, useEffect } from 'react';
import { Shield, UserX, Users, Search, ShieldCheck, ShieldOff, Megaphone, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAdminActions } from '@/hooks/useAdminActions';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  clip_id: string;
  display_name: string | null;
  created_at: string;
  roles: string[];
}

interface AdminPanelProps {
  isAdmin: boolean;
  isModerator: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AdminPanel = ({ isAdmin, isModerator, isOpen, onOpenChange }: AdminPanelProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { deleteUserMessage, deleteUserAccount, grantRole, revokeRole, clearAllMessages, createAnnouncement, deleteAnnouncement } = useAdminActions(isAdmin, isModerator);
  const { toast } = useToast();


  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, clip_id, display_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setIsLoading(false);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role),
      }));

      setUsers(usersWithRoles);
      setIsLoading(false);
    };

    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    };

    fetchUsers();
    fetchAnnouncements();
  }, [isAdmin]);

  const filteredUsers = users.filter(user => 
    user.clip_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    
    const success = await deleteUserAccount(deleteTarget.id);
    if (success) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleToggleRole = async (user: User, role: 'admin' | 'moderator') => {
    const hasRole = user.roles.includes(role);
    
    if (hasRole) {
      const success = await revokeRole(user.id, role);
      if (success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id 
            ? { ...u, roles: u.roles.filter(r => r !== role) }
            : u
        ));
      }
    } else {
      const success = await grantRole(user.id, role);
      if (success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id 
            ? { ...u, roles: [...u.roles, role] }
            : u
        ));
      }
    }
  };

  if (!isAdmin && !isModerator) return null;

  const content = (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Panel
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by clip ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.display_name || user.clip_id}
                          </span>
                          {user.roles.includes('admin') && (
                            <Badge variant="default" className="text-xs">Admin</Badge>
                          )}
                          {user.roles.includes('moderator') && (
                            <Badge variant="secondary" className="text-xs">Mod</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {user.clip_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleRole(user, 'moderator')}
                              title={user.roles.includes('moderator') ? 'Remove moderator' : 'Make moderator'}
                            >
                              {user.roles.includes('moderator') ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                              title="Delete user"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage admin and moderator roles. Admins can delete accounts and manage roles.
              Moderators can delete messages.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">Current Admins</h3>
              {users.filter(u => u.roles.includes('admin')).length === 0 ? (
                <p className="text-sm text-muted-foreground">No admins assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.filter(u => u.roles.includes('admin')).map(user => (
                    <Badge key={user.id} variant="default">
                      {user.display_name || user.clip_id}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Current Moderators</h3>
              {users.filter(u => u.roles.includes('moderator')).length === 0 ? (
                <p className="text-sm text-muted-foreground">No moderators assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.filter(u => u.roles.includes('moderator')).map(user => (
                    <Badge key={user.id} variant="secondary">
                      {user.display_name || user.clip_id}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Broadcast Announcement
              </h3>
              <Textarea
                placeholder="Type your announcement..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
              />
              <Button
                className="w-full"
                disabled={!announcementText.trim()}
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const success = await createAnnouncement(announcementText, user.id);
                    if (success) {
                      setAnnouncementText('');
                      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
                      setAnnouncements(data || []);
                    }
                  }
                }}
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Send Announcement
              </Button>
            </div>

            {announcements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Recent Announcements</h4>
                <ScrollArea className="h-32">
                  {announcements.slice(0, 5).map((ann) => (
                    <div key={ann.id} className="flex items-center justify-between p-2 bg-muted rounded mb-1">
                      <span className="text-sm truncate flex-1">{ann.content}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={async () => {
                          await deleteAnnouncement(ann.id);
                          setAnnouncements(prev => prev.filter(a => a.id !== ann.id));
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-medium text-destructive flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Danger Zone
              </h3>
              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to clear ALL messages from ALL rooms? This cannot be undone!')) {
                    await clearAllMessages();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Messages
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  // Controlled mode
  if (isOpen !== undefined && onOpenChange) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          {content}
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the profile for{' '}
                <strong>{deleteTarget?.display_name || deleteTarget?.clip_id}</strong>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Uncontrolled mode
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            Admin
          </Button>
        </DialogTrigger>
        {content}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the profile for{' '}
              <strong>{deleteTarget?.display_name || deleteTarget?.clip_id}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminPanel;
