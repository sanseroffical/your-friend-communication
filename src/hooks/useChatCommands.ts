import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommandResult {
  handled: boolean;
  message?: string;
}

export function useChatCommands(
  isAdmin: boolean,
  isModerator: boolean,
  roomCode: string,
  userId: string,
  userName: string
) {
  const { toast } = useToast();
  const canModerate = isAdmin || isModerator;

  const processCommand = useCallback(async (input: string): Promise<CommandResult> => {
    if (!input.startsWith('/')) return { handled: false };

    const parts = input.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Admin-only commands
    if (isAdmin) {
      switch (command) {
        case 'announce': {
          if (args.length === 0) return { handled: true, message: 'Usage: /announce <message>' };
          const content = args.join(' ');
          const { error } = await supabase.from('announcements').insert({ content, created_by: userId });
          if (error) return { handled: true, message: 'Failed to create announcement.' };
          toast({ title: 'Announcement sent!' });
          return { handled: true };
        }
        
        case 'clearroom': {
          const { error } = await supabase
            .from('messages')
            .delete()
            .eq('room_code', roomCode);
          if (error) return { handled: true, message: 'Failed to clear room.' };
          toast({ title: 'Room cleared!' });
          return { handled: true };
        }
        
        case 'ban': {
          if (args.length === 0) return { handled: true, message: 'Usage: /ban <clip_id>' };
          // Note: This is a soft ban via profile deletion
          const clipId = args[0].replace('@', '');
          const { data: profile } = await supabase.from('profiles').select('id').eq('clip_id', clipId).single();
          if (!profile) return { handled: true, message: `User @${clipId} not found.` };
          const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
          if (error) return { handled: true, message: 'Failed to ban user.' };
          toast({ title: `User @${clipId} banned!` });
          return { handled: true };
        }

        case 'giverole': {
          if (args.length < 2) return { handled: true, message: 'Usage: /giverole <clip_id> <admin|moderator>' };
          const clipId = args[0].replace('@', '');
          const role = args[1].toLowerCase() as 'admin' | 'moderator';
          if (role !== 'admin' && role !== 'moderator') return { handled: true, message: 'Role must be "admin" or "moderator".' };
          
          const { data: profile } = await supabase.from('profiles').select('id').eq('clip_id', clipId).single();
          if (!profile) return { handled: true, message: `User @${clipId} not found.` };
          
          const { error } = await supabase.from('user_roles').insert({ user_id: profile.id, role });
          if (error?.code === '23505') return { handled: true, message: `User already has ${role} role.` };
          if (error) return { handled: true, message: 'Failed to grant role.' };
          toast({ title: `Granted ${role} to @${clipId}!` });
          return { handled: true };
        }

        case 'removerole': {
          if (args.length < 2) return { handled: true, message: 'Usage: /removerole <clip_id> <admin|moderator>' };
          const clipId = args[0].replace('@', '');
          const role = args[1].toLowerCase() as 'admin' | 'moderator';
          
          const { data: profile } = await supabase.from('profiles').select('id').eq('clip_id', clipId).single();
          if (!profile) return { handled: true, message: `User @${clipId} not found.` };
          
          const { error } = await supabase.from('user_roles').delete().eq('user_id', profile.id).eq('role', role);
          if (error) return { handled: true, message: 'Failed to remove role.' };
          toast({ title: `Removed ${role} from @${clipId}!` });
          return { handled: true };
        }
      }
    }

    // Moderator commands (and admins)
    if (canModerate) {
      switch (command) {
        case 'deletemsg': {
          if (args.length === 0) return { handled: true, message: 'Usage: /deletemsg <message_id>' };
          const msgId = args[0];
          const { error } = await supabase.from('messages').delete().eq('id', msgId);
          if (error) return { handled: true, message: 'Failed to delete message.' };
          toast({ title: 'Message deleted!' });
          return { handled: true };
        }
        
        case 'warn': {
          if (args.length === 0) return { handled: true, message: 'Usage: /warn <clip_id> [reason]' };
          const clipId = args[0].replace('@', '');
          const reason = args.slice(1).join(' ') || 'No reason provided';
          // Send as system message
          await supabase.from('messages').insert({
            room_code: roomCode,
            sender_name: '⚠️ SYSTEM',
            content: `Warning to @${clipId}: ${reason}`,
            user_id: userId,
          });
          return { handled: true };
        }
      }
    }

    // User commands
    switch (command) {
      case 'help': {
        let helpText = 'Available commands:\n/help - Show this help\n/me <action> - Action message\n/shrug - ¯\\_(ツ)_/¯\n/tableflip - (╯°□°)╯︵ ┻━┻\n/unflip - ┬─┬ノ( º _ ºノ)';
        if (canModerate) {
          helpText += '\n\nMod commands:\n/deletemsg <id> - Delete a message\n/warn <user> [reason] - Warn a user';
        }
        if (isAdmin) {
          helpText += '\n\nAdmin commands:\n/announce <msg> - Send announcement\n/clearroom - Clear room messages\n/ban <user> - Ban a user\n/giverole <user> <role> - Grant role\n/removerole <user> <role> - Remove role';
        }
        return { handled: true, message: helpText };
      }

      case 'me': {
        if (args.length === 0) return { handled: true, message: 'Usage: /me <action>' };
        await supabase.from('messages').insert({
          room_code: roomCode,
          sender_name: userName,
          content: `*${userName} ${args.join(' ')}*`,
          user_id: userId,
        });
        return { handled: true };
      }

      case 'shrug':
        await supabase.from('messages').insert({
          room_code: roomCode,
          sender_name: userName,
          content: '¯\\_(ツ)_/¯',
          user_id: userId,
        });
        return { handled: true };

      case 'tableflip':
        await supabase.from('messages').insert({
          room_code: roomCode,
          sender_name: userName,
          content: '(╯°□°)╯︵ ┻━┻',
          user_id: userId,
        });
        return { handled: true };

      case 'unflip':
        await supabase.from('messages').insert({
          room_code: roomCode,
          sender_name: userName,
          content: '┬─┬ノ( º _ ºノ)',
          user_id: userId,
        });
        return { handled: true };
    }

    return { handled: false };
  }, [isAdmin, isModerator, canModerate, roomCode, userId, userName, toast]);

  return { processCommand };
}
