interface StickerRendererProps {
  stickerId: string;
  className?: string;
}

const STICKER_MAP: Record<string, string> = {
  'thumbsup': '👍',
  'heart': '❤️',
  'fire': '🔥',
  'laugh': '😂',
  'wow': '😮',
  'sad': '😢',
  'angry': '😠',
  'party': '🎉',
  'cool': '😎',
  'clap': '👏',
  'rocket': '🚀',
  'star': '⭐',
  'rainbow': '🌈',
  'ghost': '👻',
  'alien': '👽',
  'robot': '🤖',
  'unicorn': '🦄',
  'cat': '🐱',
  'dog': '🐶',
  'pizza': '🍕',
  'trophy': '🏆',
  'crown': '👑',
  '100': '💯',
  'money': '💰',
};

export const parseMessageWithStickers = (content: string): Array<{ type: 'text' | 'sticker'; value: string }> => {
  const parts: Array<{ type: 'text' | 'sticker'; value: string }> = [];
  const stickerRegex = /\[sticker:(\w+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = stickerRegex.exec(content)) !== null) {
    // Add text before the sticker
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) parts.push({ type: 'text', value: text });
    }
    
    // Add the sticker
    parts.push({ type: 'sticker', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: 'text', value: text });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
};

const StickerRenderer = ({ stickerId, className = '' }: StickerRendererProps) => {
  const emoji = STICKER_MAP[stickerId];
  
  if (!emoji) {
    return <span className={className}>[Unknown sticker]</span>;
  }

  return (
    <span 
      className={`inline-block text-6xl animate-bounce-slow ${className}`}
      role="img"
      aria-label={stickerId}
    >
      {emoji}
    </span>
  );
};

export default StickerRenderer;
