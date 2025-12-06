import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedLanguage } from '@/lib/i18n';

export interface UserSettings {
  theme: string;
  language: SupportedLanguage;
  notifications: {
    newContent: boolean;
    updates: boolean;
    recommendations: boolean;
  };
  autoplay: boolean;
}

const defaultSettings: UserSettings = {
  theme: 'dark-purple',
  language: 'fr',
  notifications: {
    newContent: true,
    updates: true,
    recommendations: false,
  },
  autoplay: true,
};

interface SettingsState extends UserSettings {
  setTheme: (theme: string) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setNotifications: (notifications: UserSettings['notifications']) => void;
  setAutoplay: (autoplay: boolean) => void;
  setAllSettings: (settings: UserSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotifications: (notifications) => set({ notifications }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setAllSettings: (settings) => set(settings),
    }),
    {
      name: 'cstream-settings',
    }
  )
);

export const useUserSettings = () => {
  const { user } = useAuth();
  const store = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        store.setAllSettings({
          theme: data.theme || defaultSettings.theme,
          language: (data.language as SupportedLanguage) || defaultSettings.language,
          notifications: data.notifications || defaultSettings.notifications,
          autoplay: data.autoplay ?? defaultSettings.autoplay,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return;
    setSaving(true);

    const newSettings = {
      theme: settings.theme ?? store.theme,
      language: settings.language ?? store.language,
      notifications: settings.notifications ?? store.notifications,
      autoplay: settings.autoplay ?? store.autoplay,
    };

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      store.setAllSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  }, [user, store]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    document.documentElement.className = store.theme;
  }, [store.theme]);

  return {
    settings: {
      theme: store.theme,
      language: store.language,
      notifications: store.notifications,
      autoplay: store.autoplay,
    },
    loading,
    saving,
    setTheme: (theme: string) => {
      store.setTheme(theme);
      saveSettings({ theme });
    },
    setLanguage: (language: SupportedLanguage) => {
      store.setLanguage(language);
      saveSettings({ language });
    },
    setNotifications: (notifications: UserSettings['notifications']) => {
      store.setNotifications(notifications);
      saveSettings({ notifications });
    },
    setAutoplay: (autoplay: boolean) => {
      store.setAutoplay(autoplay);
      saveSettings({ autoplay });
    },
    refetch: fetchSettings,
  };
};
