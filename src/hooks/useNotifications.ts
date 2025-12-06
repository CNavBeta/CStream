import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'new_content' | 'admin' | 'system' | 'success' | 'warning' | 'message';
  read: boolean;
  created_at: string;
  media_id?: number;
  media_type?: 'movie' | 'tv' | 'anime';
  poster_path?: string;
  sender_id?: string;
  sender_name?: string;
}

interface NotificationsState {
  notifications: Notification[];
  readStatus: Record<string, boolean>;
  unreadCount: number;
  loading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      readStatus: {},
      unreadCount: 0,
      loading: false,
      setNotifications: (notifications) => {
        const readStatus = get().readStatus;
        const updatedNotifications = notifications.map((n) => ({
          ...n,
          read: readStatus[n.id] || n.read,
        }));
        set({
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter((n) => !n.read).length,
        });
      },
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `local-${crypto.randomUUID()}`,
          created_at: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
      },
      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            readStatus: { ...state.readStatus, [id]: true },
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },
      markAllAsRead: () => {
        set((state) => {
          const newReadStatus = { ...state.readStatus };
          state.notifications.forEach((n) => {
            newReadStatus[n.id] = true;
          });
          return {
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            readStatus: newReadStatus,
            unreadCount: 0,
          };
        });
      },
      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'cstream-notifications-v3',
    }
  )
);

const fetchSiteNotificationsFromDB = async () => {
  try {
    const { data, error } = await supabase
      .from('site_notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('site_notifications table not available, using local only');
      return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as Notification['type'],
      read: false,
      created_at: n.created_at,
      media_id: n.media_id,
      media_type: n.media_type,
      poster_path: n.poster_path,
    }));
  } catch (err) {
    console.log('Error fetching site notifications:', err);
    return [];
  }
};

export const useNotifications = () => {
  const store = useNotificationsStore();
  const [initialized, setInitialized] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (store.loading) return;
    store.setLoading(true);
    
    try {
      const siteNotifications = await fetchSiteNotificationsFromDB();
      const combined = [...store.notifications.filter(n => n.id.startsWith('local-')), ...siteNotifications];
      const unique = combined.filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i);
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      store.setNotifications(unique);
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (!initialized) {
      fetchNotifications();
      setInitialized(true);
    }

    const dbChannel = supabase
      .channel('site_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'site_notifications',
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            type: payload.new.type as Notification['type'],
            read: false,
            created_at: payload.new.created_at,
            media_id: payload.new.media_id,
            media_type: payload.new.media_type,
            poster_path: payload.new.poster_path,
          };
          store.addNotification({
            title: newNotification.title,
            message: newNotification.message,
            type: newNotification.type,
            media_id: newNotification.media_id,
            media_type: newNotification.media_type,
            poster_path: newNotification.poster_path,
          });
        }
      )
      .subscribe();

    const broadcastChannel = supabase
      .channel('admin-notifications')
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        if (payload.payload) {
          store.addNotification({
            title: payload.payload.title,
            message: payload.payload.message,
            type: payload.payload.type as Notification['type'],
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [initialized, fetchNotifications, store]);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    loading: store.loading,
    addNotification: store.addNotification,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    clearNotifications: store.clearNotifications,
    deleteNotification: store.deleteNotification,
    refetch: fetchNotifications,
  };
};

export const sendDiscordWebhook = async (
  webhookUrl: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' = 'info',
  mediaInfo?: { media_id?: number; media_type?: 'movie' | 'tv' | 'anime'; poster_path?: string }
) => {
  if (!webhookUrl) return { success: false, error: 'No webhook URL' };

  try {
    const colorMap = {
      info: 0x3b82f6,
      success: 0x22c55e,
      warning: 0xf59e0b,
    };

    const embed: any = {
      title: `📢 ${title}`,
      description: message,
      color: colorMap[type] || 0x8b5cf6,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'CStream Notifications',
        icon_url: 'https://cstream.app/favicon.png',
      },
    };

    if (mediaInfo?.poster_path) {
      embed.thumbnail = {
        url: `https://image.tmdb.org/t/p/w200${mediaInfo.poster_path}`,
      };
    }

    if (mediaInfo?.media_type && mediaInfo?.media_id) {
      embed.fields = [
        {
          name: 'Type',
          value: mediaInfo.media_type === 'movie' ? '🎬 Film' : '📺 Série',
          inline: true,
        },
        {
          name: 'TMDB ID',
          value: String(mediaInfo.media_id),
          inline: true,
        },
      ];
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CStream',
        avatar_url: 'https://cstream.app/favicon.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Discord webhook error:', error);
    return { success: false, error };
  }
};

export const sendMessageNotification = (
  senderName: string,
  messagePreview: string,
  senderId: string
) => {
  useNotificationsStore.getState().addNotification({
    title: `Nouveau message de ${senderName}`,
    message: messagePreview.slice(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    type: 'message',
    sender_id: senderId,
    sender_name: senderName,
  });
};
