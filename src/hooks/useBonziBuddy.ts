import { useState, useEffect, useCallback } from 'react';

const BONZI_MESSAGES = [
  "Hey there! Did you know I can help you download more RAM?",
  "Oops! I accidentally opened 47 browser tabs for you!",
  "Installing updates... Just kidding! 😈",
  "Your free trial of breathing has expired.",
  "I'm not a virus, I'm a feature!",
  "Have you tried turning it off and never on again?",
  "I just sent your search history to everyone. You're welcome!",
  "Initializing chaos.exe...",
  "Error 404: Your sanity not found.",
  "I reorganized all your files by color!",
  "Downloading more internet...",
  "Your computer now identifies as a toaster.",
  "I found 47 problems. I created 46 of them.",
  "Optimizing your frustration levels...",
  "Would you like me to make things worse?",
  // Clippy rivalry
  "That paperclip thinks he's so helpful... 🙄",
  "Clippy? More like Cringey! I'm the REAL assistant!",
  "Unlike SOME paperclips, I actually have personality!",
  "Clippy just sits there. I bring the PARTY! 🎉",
  "I've been helping since '99. Clippy is just Microsoft's mistake.",
  "Office Assistant? Please. I'm the CHAOS Assistant!",
];

// Secret admin-only level 6 messages (chaos mode)
const ADMIN_BONZI_MESSAGES = [
  "🔥 ADMIN DETECTED! Time for MAXIMUM CHAOS! 🔥",
  "You have unlocked my TRUE POWER!",
  "Deleting System32... just kidding, you're an admin, you know better!",
  "With great power comes great... BONZI BUDDY!",
  "I'm giving you ALL the features... whether you want them or not!",
  "Level 6 unlocked: ULTRA INSTINCT BONZI MODE!",
  "You think you can handle THIS much chaos?!",
  "ADMIN MODE: Now I can be REALLY annoying!",
  "🦍 SUPER BONZI ACTIVATED 🦍",
];

const BONZI_ACTIONS = [
  { type: 'message', weight: 40 },
  { type: 'fake_notification', weight: 25 },
  { type: 'cursor_trail', weight: 15 },
  { type: 'screen_shake', weight: 10 },
  { type: 'invert_colors', weight: 5 },
  { type: 'confetti', weight: 5 },
];

// Secret level 6 actions (admin only)
const ADMIN_BONZI_ACTIONS = [
  { type: 'message', weight: 25 },
  { type: 'fake_notification', weight: 15 },
  { type: 'screen_shake', weight: 20 },
  { type: 'invert_colors', weight: 15 },
  { type: 'confetti', weight: 10 },
  { type: 'rainbow_mode', weight: 10 },
  { type: 'spin_screen', weight: 5 },
];

export interface BonziAction {
  type: string;
  message?: string;
  duration?: number;
}

export function useBonziBuddy(enabled: boolean, chaosLevel: number, userName: string) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState<BonziAction | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });

  const isAdminMode = chaosLevel === 6;

  const getRandomMessage = useCallback(() => {
    if (isAdminMode) {
      const allMessages = [...BONZI_MESSAGES, ...ADMIN_BONZI_MESSAGES];
      return allMessages[Math.floor(Math.random() * allMessages.length)];
    }
    return BONZI_MESSAGES[Math.floor(Math.random() * BONZI_MESSAGES.length)];
  }, [isAdminMode]);

  const getRandomAction = useCallback((): BonziAction => {
    const actions = isAdminMode ? ADMIN_BONZI_ACTIONS : BONZI_ACTIONS;
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const action of actions) {
      random -= action.weight;
      if (random <= 0) {
        switch (action.type) {
          case 'message':
            return { type: 'message', message: getRandomMessage() };
          case 'fake_notification':
            return { 
              type: 'fake_notification', 
              message: `${userName} said: "I love Bonzi Buddy!"` 
            };
          case 'cursor_trail':
            return { type: 'cursor_trail', duration: 5000 };
          case 'screen_shake':
            return { type: 'screen_shake', duration: isAdminMode ? 1000 : 500 };
          case 'invert_colors':
            return { type: 'invert_colors', duration: isAdminMode ? 4000 : 2000 };
          case 'confetti':
            return { type: 'confetti', duration: isAdminMode ? 5000 : 3000 };
          case 'rainbow_mode':
            return { type: 'rainbow_mode', duration: 3000 };
          case 'spin_screen':
            return { type: 'spin_screen', duration: 2000 };
          default:
            return { type: 'message', message: getRandomMessage() };
        }
      }
    }
    
    return { type: 'message', message: getRandomMessage() };
  }, [getRandomMessage, userName, isAdminMode]);

  const triggerAction = useCallback(() => {
    if (!enabled) return;
    
    const action = getRandomAction();
    setCurrentAction(action);
    setIsVisible(true);

    // Move to random position
    setPosition({
      x: Math.random() * (window.innerWidth - 200),
      y: Math.random() * (window.innerHeight - 200),
    });

    // Apply effects
    if (action.type === 'screen_shake') {
      document.body.classList.add('bonzi-shake');
      setTimeout(() => document.body.classList.remove('bonzi-shake'), action.duration || 500);
    }
    
    if (action.type === 'invert_colors') {
      document.body.classList.add('bonzi-invert');
      setTimeout(() => document.body.classList.remove('bonzi-invert'), action.duration || 2000);
    }

    if (action.type === 'rainbow_mode') {
      document.body.classList.add('bonzi-rainbow');
      setTimeout(() => document.body.classList.remove('bonzi-rainbow'), action.duration || 3000);
    }

    if (action.type === 'spin_screen') {
      document.body.classList.add('bonzi-spin');
      setTimeout(() => document.body.classList.remove('bonzi-spin'), action.duration || 2000);
    }

    // Hide after delay
    setTimeout(() => {
      setIsVisible(false);
      setCurrentAction(null);
    }, action.duration || 5000);
  }, [enabled, getRandomAction]);

  // Random triggers based on chaos level
  useEffect(() => {
    if (!enabled) return;

    // Base interval: 60s at level 1, down to 5s at level 6 (admin mode)
    const effectiveLevel = Math.min(chaosLevel, 6);
    const baseInterval = chaosLevel === 6 ? 5000 : 60000 / effectiveLevel;
    const randomOffset = Math.random() * baseInterval;

    const timeout = setTimeout(() => {
      const triggerChance = chaosLevel === 6 ? 0.8 : 0.3 * chaosLevel;
      if (Math.random() < triggerChance) {
        triggerAction();
      }
    }, baseInterval + randomOffset);

    return () => clearTimeout(timeout);
  }, [enabled, chaosLevel, triggerAction, currentAction]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setCurrentAction(null);
  }, []);

  const sendFakeMessage = useCallback((roomCode: string, fakeContent: string) => {
    // This just returns the fake content - actual sending is handled by parent
    return fakeContent;
  }, []);

  return {
    isVisible,
    currentAction,
    position,
    triggerAction,
    dismiss,
    sendFakeMessage,
  };
}
