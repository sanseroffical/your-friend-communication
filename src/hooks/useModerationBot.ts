import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { containsProfanity, filterProfanity, getProfanityMatches } from '@/utils/profanityFilter';
import { useToast } from '@/hooks/use-toast';

interface ModerationResult {
  passed: boolean;
  reason?: string;
  filtered?: string;
  action?: 'none' | 'filter' | 'warn' | 'delete';
}

// Spam detection
const SPAM_THRESHOLDS = {
  maxDuplicates: 3,
  maxMessagesPerMinute: 10,
  maxCapsPercentage: 0.7,
  minMessageLength: 1,
  maxMessageLength: 2000,
};

export function useModerationBot(isEnabled: boolean = false) {
  const [isActive, setIsActive] = useState(isEnabled);
  const [recentMessages, setRecentMessages] = useState<{ content: string; timestamp: number }[]>([]);
  const { toast } = useToast();

  const toggleBot = useCallback(() => {
    setIsActive(!isActive);
    toast({
      title: isActive ? 'Moderation Bot Disabled' : 'Moderation Bot Enabled',
      description: isActive 
        ? 'Automatic moderation is now off' 
        : 'Messages will be automatically moderated',
    });
  }, [isActive, toast]);

  const checkSpam = useCallback((content: string): boolean => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old messages
    const recent = recentMessages.filter(m => m.timestamp > oneMinuteAgo);
    
    // Check rate limit
    if (recent.length >= SPAM_THRESHOLDS.maxMessagesPerMinute) {
      return true;
    }

    // Check duplicates
    const duplicateCount = recent.filter(m => 
      m.content.toLowerCase() === content.toLowerCase()
    ).length;
    
    if (duplicateCount >= SPAM_THRESHOLDS.maxDuplicates) {
      return true;
    }

    // Update recent messages
    setRecentMessages([...recent, { content, timestamp: now }]);
    
    return false;
  }, [recentMessages]);

  const checkCapsSpam = useCallback((content: string): boolean => {
    if (content.length < 10) return false;
    
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;
    
    const uppercase = letters.replace(/[^A-Z]/g, '');
    return uppercase.length / letters.length > SPAM_THRESHOLDS.maxCapsPercentage;
  }, []);

  const moderateMessage = useCallback((content: string, senderName: string): ModerationResult => {
    if (!isActive) {
      return { passed: true, action: 'none' };
    }

    // Check message length
    if (content.length < SPAM_THRESHOLDS.minMessageLength) {
      return { passed: false, reason: 'Message is too short', action: 'delete' };
    }

    if (content.length > SPAM_THRESHOLDS.maxMessageLength) {
      return { passed: false, reason: 'Message is too long', action: 'delete' };
    }

    // Check for profanity
    if (containsProfanity(content)) {
      const matches = getProfanityMatches(content);
      const filtered = filterProfanity(content);
      
      return {
        passed: true,
        reason: `Profanity detected: ${matches.join(', ')}`,
        filtered,
        action: 'filter',
      };
    }

    // Check for spam
    if (checkSpam(content)) {
      return {
        passed: false,
        reason: 'Spam detected: Too many messages or duplicate content',
        action: 'warn',
      };
    }

    // Check for excessive caps
    if (checkCapsSpam(content)) {
      return {
        passed: true,
        reason: 'Excessive caps detected',
        filtered: content.toLowerCase(),
        action: 'filter',
      };
    }

    return { passed: true, action: 'none' };
  }, [isActive, checkSpam, checkCapsSpam]);

  const logModeration = useCallback(async (
    messageId: string,
    userId: string,
    action: string,
    reason: string
  ) => {
    // Log for admin review (could store in database)
    console.log('[ModBot]', { messageId, userId, action, reason, timestamp: new Date().toISOString() });
  }, []);

  return {
    isActive,
    toggleBot,
    moderateMessage,
    logModeration,
  };
}
