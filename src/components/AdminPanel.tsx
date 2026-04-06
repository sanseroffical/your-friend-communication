import { useState, useEffect } from 'react';
import { Shield, UserX, Users, Search, ShieldCheck, ShieldOff, Megaphone, Trash2, Ban, ScrollText, Zap, EyeOff } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  clip_id: string;
  display_name: string | null;
  created_at: string;
  roles: string[];
  isShadowBanned?: boolean;
}

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
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
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [xpBoostUserId, setXpBoostUserId] = useState<string | null>(null);
  const [xpBoostAmount, setXpBoostAmount] = useState('100');
  const [shadowBanReason, setShadowBanReason] = useState('');
  const [shadowBanTarget, setShadowBanTarget] = useState<User | null>(null);
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

      const [{ data: roles }, { data: shadowBans }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('shadow_bans').select('user_id'),
      ]);

      const shadowBannedIds = new Set((shadowBans || []).map(b => b.user_id));

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role),
        isShadowBanned: shadowBannedIds.has(profile.id),
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

    const fetchAuditLog = async () => {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setAuditLog((data as AuditLogEntry[]) || []);
    };

    fetchUsers();
    fetchAnnouncements();
    fetchAuditLog();
  }, [isAdmin]);

  const logAction = async (action: string, targetUserId?: string, details?: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from('admin_audit_log') as any).insert({
      admin_id: user.id,
      action,
      target_user_id: targetUserId || null,
      details: details || {},
    });
    // Refresh audit log
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAuditLog((data as unknown as AuditLogEntry[]) || []);
  };

  const filteredUsers = users.filter(user => 
    user.clip_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const success = await deleteUserAccount(deleteTarget.id);
    if (success) {
      await logAction('delete_user', deleteTarget.id, { display_name: deleteTarget.display_name });
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleToggleRole = async (user: User, role: 'admin' | 'moderator') => {
    const hasRole = user.roles.includes(role);
    if (hasRole) {
      const success = await revokeRole(user.id, role);
      if (success) {
        await logAction('revoke_role', user.id, { role });
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, roles: u.roles.filter(r => r !== role) } : u
        ));
      }
    } else {
      const success = await grantRole(user.id, role);
      if (success) {
        await logAction('grant_role', user.id, { role });
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, roles: [...u.roles, role] } : u
        ));
      }
    }
  };

  const handleShadowBan = async () => {
    if (!shadowBanTarget) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('shadow_bans').insert({
      user_id: shadowBanTarget.id,
      banned_by: user.id,
      reason: shadowBanReason || null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to shadow ban user', variant: 'destructive' });
    } else {
      await logAction('shadow_ban', shadowBanTarget.id, { reason: shadowBanReason });
      toast({ title: 'User shadow banned' });
      setUsers(prev => prev.map(u => u.id === shadowBanTarget.id ? { ...u, isShadowBanned: true } : u));
    }
    setShadowBanTarget(null);
    setShadowBanReason('');
  };

  const handleRemoveShadowBan = async (userId: string) => {
    const { error } = await supabase.from('shadow_bans').delete().eq('user_id', userId);
    if (!error) {
      await logAction('remove_shadow_ban', userId);
      toast({ title: 'Shadow ban removed' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isShadowBanned: false } : u));
    }
  };

  const handleXpBoost = async () => {
    if (!xpBoostUserId) return;
    const amount = parseInt(xpBoostAmount);
    if (isNaN(amount) || amount < 1 || amount > 10000) {
      toast({ title: 'Invalid amount', description: 'XP must be between 1 and 10,000', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('admin_boost_xp', {
      p_target_user_id: xpBoostUserId,
      p_xp_amount: amount,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const target = users.find(u => u.id === xpBoostUserId);
      await logAction('xp_boost', xpBoostUserId, { amount, target_name: target?.display_name });
      toast({ title: `Boosted ${target?.display_name || 'user'} with ${amount} XP ⚡` });
    }
    setXpBoostUserId(null);
    setXpBoostAmount('100');
  };

  if (!isAdmin && !isModerator) return null;

  const content = (
    <DialogContent className="max-w-2xl max-h-[85vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Panel
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1 text-xs">
            <Megaphone className="h-3.5 w-3.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1 text-xs">
            <ScrollText className="h-3.5 w-3.5" />
            Audit Log
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
                          {user.isShadowBanned && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <EyeOff className="h-3 w-3" />
                              Shadow Banned
                            </Badge>
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
                              onClick={() => {
                                setXpBoostUserId(user.id);
                              }}
                              title="Boost XP"
                            >
                              <Zap className="h-4 w-4 text-yellow-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (user.isShadowBanned) {
                                  handleRemoveShadowBan(user.id);
                                } else {
                                  setShadowBanTarget(user);
                                }
                              }}
                              title={user.isShadowBanned ? 'Remove shadow ban' : 'Shadow ban'}
                            >
                              <EyeOff className={`h-4 w-4 ${user.isShadowBanned ? 'text-destructive' : ''}`} />
                            </Button>
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
                      await logAction('create_announcement', undefined, { content: announcementText.slice(0, 100) });
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
                          await logAction('delete_announcement', undefined, { content: ann.content?.slice(0, 100) });
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
                    await logAction('clear_all_messages');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Messages
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Admin Activity Log
            </h3>
            <ScrollArea className="h-[300px]">
              {auditLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No admin actions recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry) => {
                    const adminUser = users.find(u => u.id === entry.admin_id);
                    const targetUser = entry.target_user_id ? users.find(u => u.id === entry.target_user_id) : null;
                    return (
                      <div key={entry.id} className="p-3 rounded-lg border border-border text-sm">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {entry.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          <span className="font-medium text-foreground">{adminUser?.display_name || 'Admin'}</span>
                          {targetUser && (
                            <> → <span className="font-medium text-foreground">{targetUser.display_name || targetUser.clip_id}</span></>
                          )}
                        </p>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  const dialogs = (
    <>
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

      {/* Shadow Ban Dialog */}
      <AlertDialog open={!!shadowBanTarget} onOpenChange={() => setShadowBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Shadow Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Shadow banning <strong>{shadowBanTarget?.display_name || shadowBanTarget?.clip_id}</strong> will hide their messages from other users without them knowing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason (optional)..."
            value={shadowBanReason}
            onChange={(e) => setShadowBanReason(e.target.value)}
            rows={2}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleShadowBan} className="bg-destructive text-destructive-foreground">
              Shadow Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* XP Boost Dialog */}
      <AlertDialog open={!!xpBoostUserId} onOpenChange={() => setXpBoostUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Boost XP
            </AlertDialogTitle>
            <AlertDialogDescription>
              Grant bonus XP to <strong>{users.find(u => u.id === xpBoostUserId)?.display_name || 'this user'}</strong>.
              Maximum: 10,000 XP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="number"
            min="1"
            max="10000"
            value={xpBoostAmount}
            onChange={(e) => setXpBoostAmount(e.target.value)}
            placeholder="XP amount"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleXpBoost}>
              <Zap className="h-4 w-4 mr-2" />
              Boost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Controlled mode
  if (isOpen !== undefined && onOpenChange) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          {content}
        </Dialog>
        {dialogs}
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
      {dialogs}
    </>
  );
};

export default AdminPanel;