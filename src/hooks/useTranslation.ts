import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
] as const;

type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const useTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, Record<string, string>>>({});
  const { toast } = useToast();

  const translateText = async (text: string, targetLang: LanguageCode, textId?: string): Promise<string> => {
    // Check cache first
    if (textId && translatedTexts[textId]?.[targetLang]) {
      return translatedTexts[textId][targetLang];
    }

    setIsTranslating(true);
    try {
      // Using free translation API (LibreTranslate compatible)
      const response = await fetch('https://api.mymemory.translated.net/get', {
        method: 'GET',
      });

      // Fallback: Use MyMemory API which is free
      const translateUrl = new URL('https://api.mymemory.translated.net/get');
      translateUrl.searchParams.set('q', text);
      translateUrl.searchParams.set('langpair', `en|${targetLang}`);

      const res = await fetch(translateUrl.toString());
      const data = await res.json();

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        
        // Cache the result
        if (textId) {
          setTranslatedTexts(prev => ({
            ...prev,
            [textId]: {
              ...(prev[textId] || {}),
              [targetLang]: translated
            }
          }));
        }
        
        return translated;
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation failed',
        description: 'Could not translate text. Please try again.',
        variant: 'destructive'
      });
      return text; // Return original text on failure
    } finally {
      setIsTranslating(false);
    }
  };

  const clearTranslationCache = () => {
    setTranslatedTexts({});
  };

  return {
    translateText,
    isTranslating,
    supportedLanguages: SUPPORTED_LANGUAGES,
    clearTranslationCache,
    translatedTexts
  };
};
