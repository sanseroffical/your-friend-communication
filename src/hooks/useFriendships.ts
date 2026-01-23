import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    clip_id: string;
    avatar_url: string | null;
  };
}

interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    clip_id: string;
    avatar_url: string | null;
  };
}

export function useFriendships(userId: string) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchFriendships = useCallback(async () => {
    if (!userId) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendships) {
      // Get all unique user IDs to fetch profiles
      const userIds = new Set<string>();
      friendships.forEach(f => {
        userIds.add(f.requester_id);
        userIds.add(f.addressee_id);
      });
      userIds.delete(userId);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, clip_id, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched = friendships.map(f => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'declined',
        profile: profileMap.get(f.requester_id === userId ? f.addressee_id : f.requester_id),
      }));

      setFriends(enriched.filter(f => f.status === 'accepted'));
      setPendingRequests(enriched.filter(f => f.status === 'pending' && f.addressee_id === userId));
      setSentRequests(enriched.filter(f => f.status === 'pending' && f.requester_id === userId));
    }
    setIsLoading(false);
  }, [userId]);

  const fetchBlocks = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', userId);

    if (data && data.length > 0) {
      const blockedIds = data.map(b => b.blocked_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, clip_id, avatar_url')
        .in('id', blockedIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setBlocks(data.map(b => ({ ...b, profile: profileMap.get(b.blocked_id) })));
    } else {
      setBlocks([]);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriendships();
    fetchBlocks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriendships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFriendships, fetchBlocks]);

  const sendFriendRequest = useCallback(async (targetUserId: string) => {
    if (!userId) return false;

    // Check if blocked
    const isBlocked = blocks.some(b => b.blocked_id === targetUserId);
    if (isBlocked) {
      toast({ title: "Cannot send request", description: "You have blocked this user.", variant: "destructive" });
      return false;
    }

    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: targetUserId });

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Request already sent", variant: "destructive" });
      } else {
        toast({ title: "Error sending request", variant: "destructive" });
      }
      return false;
    }

    toast({ title: "Friend request sent!" });
    fetchFriendships();
    return true;
  }, [userId, blocks, toast, fetchFriendships]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (error) {
      toast({ title: "Error accepting request", variant: "destructive" });
      return false;
    }

    toast({ title: "Friend request accepted!" });
    fetchFriendships();
    return true;
  }, [toast, fetchFriendships]);

  const declineRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (error) {
      toast({ title: "Error declining request", variant: "destructive" });
      return false;
    }

    toast({ title: "Friend request declined" });
    fetchFriendships();
    return true;
  }, [toast, fetchFriendships]);

  const unfriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast({ title: "Error removing friend", variant: "destructive" });
      return false;
    }

    toast({ title: "Friend removed" });
    fetchFriendships();
    return true;
  }, [toast, fetchFriendships]);

  const blockUser = useCallback(async (targetUserId: string) => {
    if (!userId) return false;

    // Remove any existing friendship first
    await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`);

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: userId, blocked_id: targetUserId });

    if (error) {
      if (error.code === '23505') {
        toast({ title: "User already blocked" });
      } else {
        toast({ title: "Error blocking user", variant: "destructive" });
      }
      return false;
    }

    toast({ title: "User blocked" });
    fetchBlocks();
    fetchFriendships();
    return true;
  }, [userId, toast, fetchBlocks, fetchFriendships]);

  const unblockUser = useCallback(async (blockId: string) => {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      toast({ title: "Error unblocking user", variant: "destructive" });
      return false;
    }

    toast({ title: "User unblocked" });
    fetchBlocks();
    return true;
  }, [toast, fetchBlocks]);

  const getFriendshipStatus = useCallback((targetUserId: string) => {
    if (blocks.some(b => b.blocked_id === targetUserId)) return 'blocked';
    
    const friendship = [...friends, ...pendingRequests, ...sentRequests].find(f => 
      f.requester_id === targetUserId || f.addressee_id === targetUserId
    );
    
    if (!friendship) return 'none';
    if (friendship.status === 'accepted') return 'friends';
    if (friendship.status === 'pending') {
      return friendship.requester_id === userId ? 'sent' : 'pending';
    }
    return 'none';
  }, [friends, pendingRequests, sentRequests, blocks, userId]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    blocks,
    isLoading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    unfriend,
    blockUser,
    unblockUser,
    getFriendshipStatus,
    refresh: fetchFriendships,
  };
}
