import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile, Sticker } from 'lucide-react';

interface EmojiStickerPickerProps {
  onSelect: (value: string, type: 'emoji' | 'sticker') => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '🫶'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
  'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧊'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🪈', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩'],
  'Objects': ['💡', '🔦', '🏮', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💰', '💴', '💵', '💶', '💷', '💳', '💎', '⚖️', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🔗', '⛓️', '🧰', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  'Symbols': ['💯', '🔥', '✨', '🌟', '💫', '⭐', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌊', '💧', '💦', '☔', '☂️', '🌀', '🌙', '🌛', '🌜', '🌚', '🌝', '🌞', '⚡', '🔆', '🔅', '✅', '☑️', '❎', '❌', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '❓', '❔', '❕', '❗', '‼️', '⁉️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✳️', '❇️', '✴️', '🔆', '🔅', '⚜️', '🔱', '📛', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪'],
};

const STICKERS = [
  { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up', size: 'large' },
  { id: 'heart', emoji: '❤️', name: 'Heart', size: 'large' },
  { id: 'fire', emoji: '🔥', name: 'Fire', size: 'large' },
  { id: 'laugh', emoji: '😂', name: 'Laugh', size: 'large' },
  { id: 'wow', emoji: '😮', name: 'Wow', size: 'large' },
  { id: 'sad', emoji: '😢', name: 'Sad', size: 'large' },
  { id: 'angry', emoji: '😠', name: 'Angry', size: 'large' },
  { id: 'party', emoji: '🎉', name: 'Party', size: 'large' },
  { id: 'cool', emoji: '😎', name: 'Cool', size: 'large' },
  { id: 'clap', emoji: '👏', name: 'Clap', size: 'large' },
  { id: 'rocket', emoji: '🚀', name: 'Rocket', size: 'large' },
  { id: 'star', emoji: '⭐', name: 'Star', size: 'large' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow', size: 'large' },
  { id: 'ghost', emoji: '👻', name: 'Ghost', size: 'large' },
  { id: 'alien', emoji: '👽', name: 'Alien', size: 'large' },
  { id: 'robot', emoji: '🤖', name: 'Robot', size: 'large' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', size: 'large' },
  { id: 'cat', emoji: '🐱', name: 'Cat', size: 'large' },
  { id: 'dog', emoji: '🐶', name: 'Dog', size: 'large' },
  { id: 'pizza', emoji: '🍕', name: 'Pizza', size: 'large' },
  { id: 'trophy', emoji: '🏆', name: 'Trophy', size: 'large' },
  { id: 'crown', emoji: '👑', name: 'Crown', size: 'large' },
  { id: '100', emoji: '💯', name: '100', size: 'large' },
  { id: 'money', emoji: '💰', name: 'Money', size: 'large' },
];

const EmojiStickerPicker = ({ onSelect }: EmojiStickerPickerProps) => {
  const [open, setOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('Smileys');

  const handleSelect = (value: string, type: 'emoji' | 'sticker') => {
    onSelect(value, type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue="emoji" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="emoji" className="gap-1">
              <Smile className="h-4 w-4" />
              Emoji
            </TabsTrigger>
            <TabsTrigger value="sticker" className="gap-1">
              <Sticker className="h-4 w-4" />
              Stickers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="p-2">
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <Button
                  key={cat}
                  variant={emojiCategory === cat ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setEmojiCategory(cat)}
                  className="shrink-0 text-xs px-2"
                >
                  {EMOJI_CATEGORIES[cat as keyof typeof EMOJI_CATEGORIES][0]}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[emojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(emoji, 'emoji')}
                    className="h-8 w-8 flex items-center justify-center text-xl hover:bg-muted rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sticker" className="p-2">
            <ScrollArea className="h-48">
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => handleSelect(`[sticker:${sticker.id}]`, 'sticker')}
                    className="aspect-square flex flex-col items-center justify-center text-4xl hover:bg-muted rounded-lg transition-colors p-2"
                    title={sticker.name}
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiStickerPicker;
