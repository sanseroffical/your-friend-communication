import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminActions(isAdmin: boolean, isModerator: boolean) {
  const { toast } = useToast();
  const canModerate = isAdmin || isModerator;

  const deleteUserMessage = useCallback(async (messageId: string) => {
    // UX-only early return — actual security enforced by RLS policies
    if (!canModerate) {
      toast({
        title: "Unauthorized",
        description: "You don't have permission to delete this message.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Message deleted by moderator" });
    return true;
  }, [canModerate, toast]);

  const deleteUserAccount = useCallback(async (targetUserId: string) => {
    // UX-only early return — actual security enforced by RLS policies
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can delete accounts.",
        variant: "destructive",
      });
      return false;
    }

    // Delete profile (cascade will handle related data)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. The user's auth account remains.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "User profile deleted" });
    return true;
  }, [isAdmin, toast]);

  const grantRole = useCallback(async (targetUserId: string, role: 'admin' | 'moderator') => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can grant roles.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        role,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already assigned",
          description: `User already has the ${role} role.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to grant role.",
          variant: "destructive",
        });
      }
      return false;
    }

    toast({ title: `${role} role granted` });
    return true;
  }, [isAdmin, toast]);

  const revokeRole = useCallback(async (targetUserId: string, role: 'admin' | 'moderator') => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can revoke roles.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('role', role);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to revoke role.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: `${role} role revoked` });
    return true;
  }, [isAdmin, toast]);

  const clearAllMessages = useCallback(async () => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can clear all messages.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear messages.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "All messages cleared" });
    return true;
  }, [isAdmin, toast]);

  const createAnnouncement = useCallback(async (content: string, userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can create announcements.",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from('announcements')
      .insert({ content, created_by: userId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Announcement sent!" });
    return true;
  }, [isAdmin, toast]);

  const deleteAnnouncement = useCallback(async (announcementId: string) => {
    if (!isAdmin) return false;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement.",
        variant: "destructive",
      });
      return false;
    }

    toast({ title: "Announcement deleted" });
    return true;
  }, [isAdmin, toast]);

  return {
    canModerate,
    deleteUserMessage,
    deleteUserAccount,
    grantRole,
    revokeRole,
    clearAllMessages,
    createAnnouncement,
    deleteAnnouncement,
  };
}
