import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslateButtonProps {
  text: string;
  textId: string;
  onTranslate: (translatedText: string, lang: string) => void;
  size?: 'sm' | 'default' | 'icon';
}

const TranslateButton = ({ text, textId, onTranslate, size = 'icon' }: TranslateButtonProps) => {
  const { translateText, isTranslating, supportedLanguages } = useTranslation();
  const [currentLang, setCurrentLang] = useState<string | null>(null);

  const handleTranslate = async (langCode: string, langName: string) => {
    const translated = await translateText(text, langCode as any, textId);
    setCurrentLang(langName);
    onTranslate(translated, langName);
  };

  const handleShowOriginal = () => {
    setCurrentLang(null);
    onTranslate(text, 'Original');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={size}
          className="h-6 w-6 p-0"
          disabled={isTranslating}
        >
          {isTranslating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Languages className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
        {currentLang && (
          <DropdownMenuItem onClick={handleShowOriginal}>
            Show Original
          </DropdownMenuItem>
        )}
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleTranslate(lang.code, lang.name)}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TranslateButton;
