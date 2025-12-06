import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Film, MessageSquare, Tv, Sparkles, Info, Check, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useI18n } from '@/lib/i18n';
import { tmdbApi } from '@/lib/tmdb';
import { Link } from 'react-router-dom';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsPanel = ({ open, onClose }: NotificationsPanelProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, deleteNotification, loading } = useNotifications();
  const { t } = useI18n();

  const getIcon = useCallback((type: Notification['type'], mediaType?: string) => {
    if (mediaType === 'movie') return <Film className="w-5 h-5 text-red-500" />;
    if (mediaType === 'tv') return <Tv className="w-5 h-5 text-blue-500" />;
    if (mediaType === 'anime') return <Sparkles className="w-5 h-5 text-pink-500" />;
    
    switch (type) {
      case 'new_content':
        return <Film className="w-5 h-5 text-primary" />;
      case 'admin':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'system':
        return <Info className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  }, []);

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'border-l-green-500';
      case 'warning': return 'border-l-orange-500';
      case 'admin': return 'border-l-blue-500';
      case 'message': return 'border-l-purple-500';
      case 'new_content': return 'border-l-primary';
      default: return 'border-l-muted';
    }
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.media_id && notification.media_type) {
      onClose();
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.media_id && notification.media_type) {
      const type = notification.media_type === 'anime' ? 'tv' : notification.media_type;
      return `/${type}/${notification.media_id}`;
    }
    if (notification.type === 'message' && notification.sender_id) {
      return '/chat';
    }
    return null;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="fixed right-6 top-20 h-[80vh] w-[380px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{t('notifications.title')}</h2>
                  {unreadCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearNotifications}
                    className="rounded-full hover:bg-white/10 text-white/60 hover:text-red-400"
                    title="Tout supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bell className="w-16 h-16 mb-4 text-white/10" />
                  <p className="text-sm text-white/60 font-medium">{t('notifications.noNotifications')}</p>
                  <p className="text-xs text-white/40 mt-1">Les nouvelles notifications apparaîtront ici</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const link = getNotificationLink(notification);
                  const content = (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {notification.poster_path ? (
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-secondary shadow-lg">
                            <img
                              src={tmdbApi.getImageUrl(notification.poster_path, 'w200')}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                            {getIcon(notification.type, notification.media_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium line-clamp-1 ${
                              !notification.read ? 'text-white' : 'text-white/50'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse" />
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white/40" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-white/60 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-white/40 mt-2 flex items-center gap-2">
                          {formatDate(notification.created_at)}
                          {notification.type === 'message' && notification.sender_name && (
                            <span className="text-purple-400">De {notification.sender_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );

                  const baseClasses = `group block w-full p-3 rounded-xl text-left transition-all border-l-4 ${getTypeColor(notification.type)} ${
                    !notification.read
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'hover:bg-white/5'
                  }`;

                  if (link) {
                    return (
                      <Link
                        key={notification.id}
                        to={link}
                        onClick={() => handleNotificationClick(notification)}
                        className={baseClasses}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={baseClasses}
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && unreadCount > 0 && (
              <div className="p-3 border-t border-white/10">
                <Button
                  variant="outline"
                  className="w-full rounded-full text-xs bg-white/5 hover:bg-white/10 text-white border-white/10 gap-2"
                  onClick={markAllAsRead}
                >
                  <Check className="w-3 h-3" />
                  {t('notifications.markAllRead')}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
