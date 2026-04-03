import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserSettings {
  theme: string;
  font_size: string;
  font_family: string;
  reduce_motion: boolean;
  high_contrast: boolean;
  screen_reader_mode: boolean;
  bonzi_enabled: boolean;
  bonzi_chaos_level: number;
  command_prompt_mode: boolean;
  ambient_volume: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'default',
  font_size: 'medium',
  font_family: 'default',
  reduce_motion: false,
  high_contrast: false,
  screen_reader_mode: false,
  bonzi_enabled: false,
  bonzi_chaos_level: 1,
  command_prompt_mode: false,
  ambient_volume: 0.5,
};

export const THEMES = [
  { id: 'default', name: 'Default', class: '' },
  { id: 'dark', name: 'Dark', class: 'theme-dark' },
  { id: 'black', name: 'Pitch Black', class: 'theme-black' },
  { id: 'blue', name: 'Ocean Blue', class: 'theme-blue' },
  { id: 'red', name: 'Ruby Red', class: 'theme-red' },
  { id: 'seasonal', name: 'Seasonal', class: 'theme-seasonal' },
  { id: 'rainbow', name: 'Rainbow', class: 'theme-rainbow' },
  { id: 'strobe', name: 'Strobe ⚠️', class: 'theme-strobe', warning: 'Photosensitivity warning: Flashing lights' },
];

export const FONTS = [
  { id: 'default', name: 'System Default', class: '' },
  { id: 'dyslexic', name: 'OpenDyslexic', class: 'font-dyslexic' },
  { id: 'mono', name: 'Monospace', class: 'font-mono' },
  { id: 'serif', name: 'Serif', class: 'font-serif' },
  { id: 'comic', name: 'Comic Sans', class: 'font-comic' },
];

export const FONT_SIZES = [
  { id: 'small', name: 'Small', class: 'text-sm' },
  { id: 'medium', name: 'Medium', class: 'text-base' },
  { id: 'large', name: 'Large', class: 'text-lg' },
  { id: 'xlarge', name: 'Extra Large', class: 'text-xl' },
];

export function useUserSettings(userId: string | null) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [roomTheme, setRoomTheme] = useState<string | null>(null);

  // Detect iOS accessibility settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
      
      if (prefersReducedMotion || prefersHighContrast) {
        setSettings(prev => ({
          ...prev,
          reduce_motion: prefersReducedMotion,
          high_contrast: prefersHighContrast,
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setSettings({
          theme: data.theme || 'default',
          font_size: data.font_size || 'medium',
          font_family: data.font_family || 'default',
          reduce_motion: data.reduce_motion || false,
          high_contrast: data.high_contrast || false,
          screen_reader_mode: data.screen_reader_mode || false,
          bonzi_enabled: data.bonzi_enabled || false,
          bonzi_chaos_level: data.bonzi_chaos_level || 1,
          command_prompt_mode: data.command_prompt_mode || false,
        });
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, [userId]);

  // Apply theme to document
  useEffect(() => {
    const activeTheme = roomTheme || settings.theme;
    const themeConfig = THEMES.find(t => t.id === activeTheme);
    
    // Remove all theme classes
    THEMES.forEach(t => {
      if (t.class) document.documentElement.classList.remove(t.class);
    });
    
    // Apply new theme
    if (themeConfig?.class) {
      document.documentElement.classList.add(themeConfig.class);
    }

    // Apply font settings
    const fontConfig = FONTS.find(f => f.id === settings.font_family);
    FONTS.forEach(f => {
      if (f.class) document.documentElement.classList.remove(f.class);
    });
    if (fontConfig?.class) {
      document.documentElement.classList.add(fontConfig.class);
    }

    // Apply font size
    const sizeConfig = FONT_SIZES.find(s => s.id === settings.font_size);
    document.documentElement.style.setProperty('--base-font-size', 
      settings.font_size === 'small' ? '14px' :
      settings.font_size === 'large' ? '18px' :
      settings.font_size === 'xlarge' ? '20px' : '16px'
    );

    // Apply accessibility
    if (settings.reduce_motion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    if (settings.high_contrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings, roomTheme]);

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!userId) return;

    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }, [userId, settings]);

  const subscribeToRoomTheme = useCallback((roomCode: string) => {
    // Fetch initial room theme
    supabase
      .from('room_themes')
      .select('theme')
      .eq('room_code', roomCode)
      .single()
      .then(({ data }) => {
        if (data) setRoomTheme(data.theme);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`room-theme-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_themes',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.new) {
            setRoomTheme((payload.new as any).theme);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setRoomTheme(null);
    };
  }, []);

  const setRoomThemeForAll = useCallback(async (roomCode: string, theme: string, userId: string) => {
    await supabase
      .from('room_themes')
      .upsert({
        room_code: roomCode,
        theme,
        set_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_code' });
  }, []);

  return {
    settings,
    updateSettings,
    isLoading,
    roomTheme,
    subscribeToRoomTheme,
    setRoomThemeForAll,
  };
}
