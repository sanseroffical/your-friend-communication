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
];

const BONZI_ACTIONS = [
  { type: 'message', weight: 40 },
  { type: 'fake_notification', weight: 25 },
  { type: 'cursor_trail', weight: 15 },
  { type: 'screen_shake', weight: 10 },
  { type: 'invert_colors', weight: 5 },
  { type: 'confetti', weight: 5 },
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

  const getRandomMessage = useCallback(() => {
    return BONZI_MESSAGES[Math.floor(Math.random() * BONZI_MESSAGES.length)];
  }, []);

  const getRandomAction = useCallback((): BonziAction => {
    const totalWeight = BONZI_ACTIONS.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const action of BONZI_ACTIONS) {
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
            return { type: 'screen_shake', duration: 500 };
          case 'invert_colors':
            return { type: 'invert_colors', duration: 2000 };
          case 'confetti':
            return { type: 'confetti', duration: 3000 };
          default:
            return { type: 'message', message: getRandomMessage() };
        }
      }
    }
    
    return { type: 'message', message: getRandomMessage() };
  }, [getRandomMessage, userName]);

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

    // Hide after delay
    setTimeout(() => {
      setIsVisible(false);
      setCurrentAction(null);
    }, action.duration || 5000);
  }, [enabled, getRandomAction]);

  // Random triggers based on chaos level
  useEffect(() => {
    if (!enabled) return;

    // Base interval: 60s at level 1, down to 10s at level 5
    const baseInterval = 60000 / chaosLevel;
    const randomOffset = Math.random() * baseInterval;

    const timeout = setTimeout(() => {
      if (Math.random() < 0.3 * chaosLevel) {
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
