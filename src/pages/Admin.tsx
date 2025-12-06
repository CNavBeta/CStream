import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Plus, Trash2, Edit, Users, Link as LinkIcon, Save, 
  Loader2, Settings, Shield, Search, Film, Tv, Eye, EyeOff,
  Calendar, Star, Globe, Copy, CheckCircle2, AlertCircle, Info,
  TrendingUp, Database, X, ExternalLink, BarChart3, Upload, FileText,
  Mail, MessageCircle, HelpCircle, Bug, Lightbulb, Heart, Check, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================ Types ============================ */
type MediaType = 'movie' | 'tv' | 'anime' | 'series';

interface Reader {
  id: string;
  label: string;
  url: string;
  media_type: MediaType | string;
  language: string;
  enabled: boolean;
  tmdb_id?: number | null;
  season_number?: number | null;
  episode_number?: number | null;
  order_index?: number | null;
  created_at?: string;
}

interface UserData {
  id: string;
  username: string;
  avatar_url: string | null;
  friend_code: string;
  created_at: string;
  is_admin?: boolean;
  role?: string;
}

interface TMDBResult {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  overview?: string;
}

interface TMDBSeason {
  season_number: number;
  name?: string;
  episode_count?: number;
}

interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
}

/* ============================ Utilities ============================ */
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const isValidUrl = (value: string) => {
  try {
    const u = new URL(value);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
};

const normalizeBaseUrl = (url: string) => {
  if (!url) return url;
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const buildFinalUrl = (
  baseUrl: string, 
  mediaType: MediaType | string, 
  season?: number | null, 
  episode?: number | null
) => {
  const base = normalizeBaseUrl(baseUrl);
  if ((mediaType === 'series' || mediaType === 'tv' || mediaType === 'anime') && (season || episode)) {
    const parts: string[] = [base];
    if (season && Number.isFinite(season)) parts.push(`season/${season}`);
    if (episode && Number.isFinite(episode)) parts.push(`episode/${episode}`);
    return parts.join('/');
  }
  return base;
};

const getMediaTypeIcon = (type: string) => {
  switch (type) {
    case 'movie': return <Film className="w-4 h-4" />;
    case 'series': return <Tv className="w-4 h-4" />;
    case 'tv': return <Tv className="w-4 h-4" />;
    case 'anime': return <Star className="w-4 h-4" />;
    default: return <Film className="w-4 h-4" />;
  }
};

const getMediaTypeLabel = (type: string) => {
  switch (type) {
    case 'movie': return 'Film';
    case 'series': return 'Série';
    case 'tv': return 'TV';
    case 'anime': return 'Anime';
    default: return type;
  }
};

const getMediaTypeColor = (type: string) => {
  switch (type) {
    case 'movie': return 'text-blue-500';
    case 'series': return 'text-purple-500';
    case 'tv': return 'text-green-500';
    case 'anime': return 'text-pink-500';
    default: return 'text-gray-500';
  }
};

/* ============================ TMDB API ============================ */
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const useDebounced = (value: string, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const searchTMDB = async (query: string, filterType?: 'all' | 'movie' | 'tv'): Promise<TMDBResult[]> => {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key || !query.trim()) return [];
  
  let endpoint = 'search/multi';
  let searchUrl = `${TMDB_BASE}/${endpoint}?api_key=${key}&language=fr-FR&query=${encodeURIComponent(query)}&include_adult=false&page=1`;
  
  if (filterType && filterType !== 'all') {
    endpoint = `search/${filterType}`;
    searchUrl = `${TMDB_BASE}/${endpoint}?api_key=${key}&language=fr-FR&query=${encodeURIComponent(query)}&include_adult=false&page=1`;
  }
  
  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error('TMDB search failed');
  const json = await res.json();
  
  let results = json.results || [];
  
  if (filterType === 'all' || !filterType) {
    results = results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
  } else {
    results = results.map((r: any) => ({ ...r, media_type: filterType }));
  }
  
  return results
    .slice(0, 10)
    .map((r: any) => ({
      id: r.id,
      media_type: r.media_type || filterType,
      title: r.title,
      name: r.name,
      release_date: r.release_date,
      first_air_date: r.first_air_date,
      poster_path: r.poster_path,
      vote_average: r.vote_average,
      overview: r.overview,
    }));
};

const fetchTMDBById = async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TMDBResult | null> => {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) return null;
  try {
    const url = `${TMDB_BASE}/${mediaType}/${tmdbId}?api_key=${key}&language=fr-FR`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return {
      id: json.id,
      media_type: mediaType,
      title: json.title,
      name: json.name,
      release_date: json.release_date,
      first_air_date: json.first_air_date,
      poster_path: json.poster_path,
      vote_average: json.vote_average,
      overview: json.overview,
    };
  } catch {
    return null;
  }
};

const fetchTMDBSeasons = async (tmdbId: number): Promise<TMDBSeason[]> => {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) return [];
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${key}&language=fr-FR`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.seasons || []).map((s: any) => ({
    season_number: s.season_number,
    name: s.name,
    episode_count: s.episode_count,
  }));
};

/* ============================ Components ============================ */
const StatsCard = ({ title, value, icon, description }: { 
  title: string; 
  value: number | string; 
  icon: JSX.Element;
  description?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ReaderRow = ({
  reader,
  onEdit,
  onDelete,
  onToggle,
  onCopyUrl,
  onDuplicate,
}: {
  reader: Reader;
  onEdit: (r: Reader) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onCopyUrl: (url: string) => void;
  onDuplicate?: (id: string) => void;
}) => (
  <TableRow className="hover:bg-secondary/20 transition-colors group">
    <TableCell className="font-medium">
      <div className="flex items-center gap-2">
        <div className={getMediaTypeColor(reader.media_type)}>
          {getMediaTypeIcon(reader.media_type)}
        </div>
        <div>
          <div className="font-medium">{reader.label}</div>
          <div className="text-xs text-muted-foreground">
            {reader.created_at && formatDate(reader.created_at)}
          </div>
        </div>
      </div>
    </TableCell>
    <TableCell className="max-w-[300px]">
      <div className="flex items-center gap-2">
        <span className="truncate text-muted-foreground text-sm font-mono bg-secondary/50 px-2 py-1 rounded">
          {reader.url}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onCopyUrl(reader.url)}
        >
          <Copy className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => window.open(reader.url, '_blank')}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </TableCell>
    <TableCell>
      <Badge variant="outline" className="capitalize gap-1">
        {getMediaTypeIcon(reader.media_type)}
        {getMediaTypeLabel(reader.media_type)}
      </Badge>
    </TableCell>
    <TableCell>
      <Badge variant="secondary" className="uppercase font-mono">
        {reader.language}
      </Badge>
    </TableCell>
    <TableCell>
      {reader.tmdb_id ? (
        <Badge variant="default" className="gap-1">
          <Database className="w-3 h-3" />
          {reader.tmdb_id}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <AlertCircle className="w-3 h-3" />
          Non lié
        </Badge>
      )}
    </TableCell>
    <TableCell>
      {reader.season_number || reader.episode_number ? (
        <Badge variant="secondary" className="font-mono">
          {reader.season_number && `S${String(reader.season_number).padStart(2, '0')}`}
          {reader.episode_number && `E${String(reader.episode_number).padStart(2, '0')}`}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <Switch
          checked={reader.enabled}
          onCheckedChange={(checked) => onToggle(reader.id, checked)}
        />
        {reader.enabled ? (
          <Eye className="w-4 h-4 text-green-500" />
        ) : (
          <EyeOff className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </TableCell>
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        {onDuplicate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(reader.id)}
            className="h-8 w-8 hover:bg-blue-500/10 text-blue-500"
            title="Dupliquer pour un autre média"
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(reader)}
          className="h-8 w-8 hover:bg-primary/10"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(reader.id)}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
);

const UserRow = ({ userData }: { userData: UserData }) => (
  <TableRow className="hover:bg-secondary/20 transition-colors">
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 text-white flex items-center justify-center font-bold text-lg shadow-md">
          {userData.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{userData.username}</span>
            {userData.is_admin && (
              <Badge variant="default" className="text-xs gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">{userData.id.slice(0, 8)}...</p>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <Badge variant="outline" className="font-mono">{userData.friend_code}</Badge>
    </TableCell>
    <TableCell className="text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3" />
        {formatDate(userData.created_at)}
      </div>
    </TableCell>
  </TableRow>
);

/* ============================ Main Component ============================ */
const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [readers, setReaders] = useState<Reader[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);

  const [searchReaders, setSearchReaders] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [filterMediaType, setFilterMediaType] = useState<string>('all');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');

  const [formData, setFormData] = useState({
    label: '',
    baseUrl: '',
    media_type: 'movie' as MediaType,
    language: 'VOSTFR',
    season: '',
    episode: '',
    enabled: true,
    tmdb_id: null as number | null,
    tmdb: null as TMDBResult | null,
  });

  const [tmdbSearchMode, setTmdbSearchMode] = useState<'search' | 'id'>('search');
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [tmdbMediaTypeForId, setTmdbMediaTypeForId] = useState<'movie' | 'tv'>('movie');
  const [tmdbSearchTypeFilter, setTmdbSearchTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const debouncedQuery = useDebounced(tmdbQuery, 400);
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbSeasons, setTmdbSeasons] = useState<TMDBSeason[]>([]);
  const [showTmdbDropdown, setShowTmdbDropdown] = useState(false);
  const tmdbRef = useRef<HTMLDivElement | null>(null);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'success' | 'warning'>('info');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');

  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [bulkImportLabel, setBulkImportLabel] = useState('');
  const [bulkImportLanguage, setBulkImportLanguage] = useState('VOSTFR');
  const [bulkImportSeason, setBulkImportSeason] = useState('1');
  const [bulkImportTmdbId, setBulkImportTmdbId] = useState<number | null>(null);
  const [bulkImportTmdb, setBulkImportTmdb] = useState<TMDBResult | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0 });

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const fetchContactMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (!error.message.includes('does not exist')) {
          console.log('Contact messages table not available');
        }
        return;
      }
      setContactMessages((data || []) as ContactMessage[]);
    } catch (err) {
      console.log('Contact messages not available');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const updateMessageStatus = async (id: string, status: 'pending' | 'read' | 'replied') => {
    try {
      const { error } = await supabase
        .from('contact_messages' as any)
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      setContactMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      toast.success(`Statut mis à jour: ${status === 'read' ? 'Lu' : status === 'replied' ? 'Répondu' : 'En attente'}`);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      const { error } = await supabase
        .from('contact_messages' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setContactMessages(prev => prev.filter(m => m.id !== id));
      toast.success('Message supprimé');
      setMessageDialogOpen(false);
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'help': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'contribute': return <Heart className="w-4 h-4 text-pink-500" />;
      default: return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'help': return 'Aide';
      case 'bug': return 'Bug';
      case 'suggestion': return 'Suggestion';
      case 'contribute': return 'Contribution';
      default: return 'Autre';
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const readersRes = await supabase.from('readers').select('*').order('created_at', { ascending: false });
      
      if (readersRes.error) throw readersRes.error;
      setReaders((readersRes.data || []) as Reader[]);

      const usersRes = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      if (usersRes.error) throw usersRes.error;
      
      const mappedUsers = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        username: u.username || '',
        avatar_url: u.avatar_url,
        friend_code: u.friend_code || '',
        created_at: u.created_at,
        is_admin: u.is_admin || false,
        role: u.role || 'member',
      }));
      setUsers(mappedUsers as UserData[]);
    } catch (err: any) {
      toast.error(`Erreur de chargement: ${err.message || 'inconnue'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    fetchData();
    fetchContactMessages();
  }, [user, isAdmin, fetchData, fetchContactMessages]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!debouncedQuery.trim()) {
        setTmdbResults([]);
        setTmdbLoading(false);
        return;
      }
      setTmdbLoading(true);
      try {
        const res = await searchTMDB(debouncedQuery.trim(), tmdbSearchTypeFilter);
        if (!mounted) return;
        setTmdbResults(res);
        setShowTmdbDropdown(res.length > 0);
      } catch (err) {
        console.error(err);
        setTmdbResults([]);
      } finally {
        if (mounted) setTmdbLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [debouncedQuery, tmdbSearchTypeFilter]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (tmdbRef.current && !tmdbRef.current.contains(e.target as Node)) {
        setShowTmdbDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const stats = useMemo(() => {
    const totalReaders = readers.length;
    const readersEnabled = readers.filter((r) => r.enabled).length;
    const readersWithTmdb = readers.filter((r) => r.tmdb_id).length;
    const totalUsers = users.length;
    const adminUsers = users.filter((u) => u.is_admin).length;
    
    const movieReaders = readers.filter((r) => r.media_type === 'movie').length;
    const seriesReaders = readers.filter((r) => r.media_type === 'series' || r.media_type === 'tv').length;
    
    const totalMessages = contactMessages.length;
    const pendingMessages = contactMessages.filter((m) => m.status === 'pending').length;

    return { 
      totalReaders, readersEnabled, readersWithTmdb, totalUsers, adminUsers,
      movieReaders, seriesReaders, totalMessages, pendingMessages
    };
  }, [readers, users, contactMessages]);

  const filteredReaders = useMemo(() => {
    const q = searchReaders.trim().toLowerCase();
    let list = readers;

    if (q) {
      list = list.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.url.toLowerCase().includes(q) ||
          r.media_type.toLowerCase().includes(q) ||
          r.language.toLowerCase().includes(q) ||
          (r.tmdb_id && String(r.tmdb_id).includes(q))
      );
    }

    if (filterMediaType !== 'all') {
      list = list.filter((r) => r.media_type === filterMediaType);
    }

    if (filterEnabled === 'enabled') {
      list = list.filter((r) => r.enabled);
    } else if (filterEnabled === 'disabled') {
      list = list.filter((r) => !r.enabled);
    }

    return list;
  }, [readers, searchReaders, filterMediaType, filterEnabled]);

  const filteredUsers = useMemo(() => {
    const q = searchUsers.trim().toLowerCase();
    return q ? users.filter((u) => 
      u.username?.toLowerCase().includes(q) || 
      u.friend_code?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    ) : users;
  }, [users, searchUsers]);

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.warning('Le titre et le message sont requis.');
      return;
    }
    setSendingNotification(true);
    try {
      const { error } = await supabase.from('site_notifications' as any).insert({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: notificationType,
        created_by: user?.id || null,
      });

      if (error) {
        console.log('Site notifications table not available, broadcasting via realtime');
        const channel = supabase.channel('admin-notifications');
        await channel.send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            title: notificationTitle.trim(),
            message: notificationMessage.trim(),
            type: notificationType,
          }
        });
      }

      const { useNotificationsStore } = await import('@/hooks/useNotifications');
      useNotificationsStore.getState().addNotification({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: notificationType as any,
      });

      if (discordWebhookUrl.trim()) {
        try {
          const discordPayload = {
            embeds: [{
              title: `📢 ${notificationTitle.trim()}`,
              description: notificationMessage.trim(),
              color: notificationType === 'success' ? 0x22c55e : notificationType === 'warning' ? 0xf59e0b : 0x3b82f6,
              footer: { text: 'CStream Admin' },
              timestamp: new Date().toISOString(),
            }],
          };
          await fetch(discordWebhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload),
          });
          toast.success('Notification envoyée à tous les utilisateurs et à Discord !');
        } catch (webhookErr) {
          console.error('Discord webhook error:', webhookErr);
          toast.warning('Notification envoyée aux utilisateurs, mais erreur Discord webhook');
        }
      } else {
        toast.success('Notification envoyée à tous les utilisateurs !');
      }

      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('info');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message || 'inconnue'}`);
    } finally {
      setSendingNotification(false);
    }
  };

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');

  const openRoleDialog = (userData: UserData) => {
    setSelectedUserForRole(userData);
    setSelectedRole(userData.role || 'member');
    setRoleDialogOpen(true);
  };

  const updateUserRole = async () => {
    if (!selectedUserForRole) return;
    try {
      const isAdmin = selectedRole === 'admin';
      
      const updateData: any = { is_admin: isAdmin };
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', selectedUserForRole.id);
      
      if (error) {
        if (error.message.includes('role')) {
          toast.warning('La colonne "role" n\'existe pas encore. Seul is_admin a été mis à jour.');
          setUsers(prev => prev.map(u => 
            u.id === selectedUserForRole.id 
              ? { ...u, is_admin: isAdmin } 
              : u
          ));
        } else {
          throw error;
        }
      } else {
        setUsers(prev => prev.map(u => 
          u.id === selectedUserForRole.id 
            ? { ...u, role: selectedRole, is_admin: isAdmin } 
            : u
        ));
        toast.success(`Rôle mis à jour: ${selectedRole === 'admin' ? 'Admin' : selectedRole === 'moderator' ? 'Modérateur' : selectedRole === 'creator' ? 'Créateur' : 'Membre'}`);
      }
      
      setRoleDialogOpen(false);
      setSelectedUserForRole(null);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message || 'inconnue'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '', baseUrl: '', media_type: 'movie', language: 'VOSTFR',
      season: '', episode: '', enabled: true, tmdb_id: null, tmdb: null,
    });
    setEditingReader(null);
    setTmdbQuery('');
    setTmdbIdInput('');
    setTmdbResults([]);
    setTmdbSeasons([]);
    setShowTmdbDropdown(false);
    setTmdbSearchMode('search');
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (r: Reader) => {
    setFormData({
      label: r.label,
      baseUrl: normalizeBaseUrl(r.url.replace(/\/(season|episode)\/\d+/gi, '')),
      media_type: r.media_type as MediaType,
      language: r.language,
      season: r.season_number ? String(r.season_number) : '',
      episode: r.episode_number ? String(r.episode_number) : '',
      enabled: r.enabled,
      tmdb_id: r.tmdb_id || null,
      tmdb: null,
    });
    setEditingReader(r);
    setDialogOpen(true);

    if (r.tmdb_id && (r.media_type === 'tv' || r.media_type === 'series' || r.media_type === 'anime')) {
      fetchTMDBSeasons(r.tmdb_id).then(setTmdbSeasons).catch(() => setTmdbSeasons([]));
    }
  };

  const validateForm = () => {
    if (!formData.label.trim()) {
      toast.warning('Le nom est requis.');
      return false;
    }
    if (!formData.baseUrl.trim() || !isValidUrl(formData.baseUrl.trim())) {
      toast.warning('URL de base invalide.');
      return false;
    }
    if (!formData.tmdb_id) {
      toast.warning('Vous devez lier cette source à un média TMDB. Recherchez un film/série ou entrez un ID TMDB.');
      return false;
    }
    if (formData.season && (!/^\d+$/.test(formData.season) || Number(formData.season) < 0)) {
      toast.warning('Numéro de saison invalide.');
      return false;
    }
    if (formData.episode && (!/^\d+$/.test(formData.episode) || Number(formData.episode) < 0)) {
      toast.warning('Numéro d\'épisode invalide.');
      return false;
    }
    return true;
  };

  const upsertReader = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const seasonNum = formData.season ? Number(formData.season) : null;
      const episodeNum = formData.episode ? Number(formData.episode) : null;
      const finalUrl = buildFinalUrl(formData.baseUrl.trim(), formData.media_type, seasonNum, episodeNum);

      // Vérifier si une source identique existe déjà pour un autre média
      if (!editingReader) {
        const { data: existingSources, error: checkError } = await supabase
          .from('readers')
          .select('id, label, tmdb_id')
          .eq('url', finalUrl)
          .neq('tmdb_id', formData.tmdb_id);

        if (checkError) throw checkError;

        if (existingSources && existingSources.length > 0) {
          const otherMedia = existingSources[0];
          const confirmed = confirm(
            `⚠️ Cette URL existe déjà pour un autre média (TMDB ID: ${otherMedia.tmdb_id}).\n\n` +
            `Voulez-vous quand même créer cette source pour le média actuel (TMDB ID: ${formData.tmdb_id}) ?\n\n` +
            `Note: Chaque source sera exclusive à son média.`
          );
          if (!confirmed) {
            setSaving(false);
            return;
          }
        }
      }

      const payload: any = {
        label: formData.label.trim(),
        url: finalUrl,
        media_type: formData.media_type,
        language: formData.language,
        enabled: formData.enabled,
        tmdb_id: formData.tmdb_id,
        season_number: seasonNum,
        episode_number: episodeNum,
      };

      if (editingReader) {
        // Si on change le TMDB ID d'une source existante
        if (editingReader.tmdb_id !== formData.tmdb_id) {
          const confirmed = confirm(
            `⚠️ Vous êtes sur le point de changer le média lié de cette source.\n\n` +
            `Ancien média: TMDB ID ${editingReader.tmdb_id}\n` +
            `Nouveau média: TMDB ID ${formData.tmdb_id}\n\n` +
            `Cette source ne sera plus visible pour l'ancien média. Continuer ?`
          );
          if (!confirmed) {
            setSaving(false);
            return;
          }
        }

        const { error } = await supabase.from('readers').update(payload).eq('id', editingReader.id);
        if (error) throw error;
        setReaders((prev) => prev.map((r) => (r.id === editingReader.id ? { ...r, ...payload } as Reader : r)));
        toast.success('Source mise à jour avec succès', { icon: <CheckCircle2 className="w-4 h-4" /> });
      } else {
        const { data, error } = await supabase.from('readers').insert(payload).select().single();
        if (error) throw error;
        setReaders((prev) => [data as Reader, ...prev]);
        toast.success(
          `Source ajoutée avec succès pour le média TMDB ID: ${formData.tmdb_id}`, 
          { icon: <CheckCircle2 className="w-4 h-4" /> }
        );
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message || 'inconnue'}`, { icon: <AlertCircle className="w-4 h-4" /> });
    } finally {
      setSaving(false);
    }
  };

  const deleteReader = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette source ? Cette action est irréversible.')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('readers').delete().eq('id', id);
      if (error) throw error;
      setReaders((prev) => prev.filter((r) => r.id !== id));
      toast.success('Source supprimée avec succès', { icon: <Trash2 className="w-4 h-4" /> });
    } catch (err: any) {
      toast.error(`Suppression impossible: ${err.message || 'inconnue'}`, { icon: <AlertCircle className="w-4 h-4" /> });
    } finally {
      setSaving(false);
    }
  };

  const toggleReader = async (id: string, enabled: boolean) => {
    setReaders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    try {
      const { error } = await supabase.from('readers').update({ enabled }).eq('id', id);
      if (error) throw error;
      toast.success(enabled ? 'Source activée' : 'Source désactivée', {
        icon: enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
      });
    } catch {
      setReaders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)));
      toast.error('Impossible de changer l\'état', { icon: <AlertCircle className="w-4 h-4" /> });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiée dans le presse-papier', { icon: <Copy className="w-4 h-4" /> });
  };

  const duplicateSourceForMedia = async (sourceId: string) => {
    const source = readers.find(r => r.id === sourceId);
    if (!source) return;

    // Ouvrir le dialog avec les données pré-remplies mais sans TMDB ID
    setFormData({
      label: `${source.label} (copie)`,
      baseUrl: normalizeBaseUrl(source.url.replace(/\/(season|episode)\/\d+/gi, '')),
      media_type: source.media_type as MediaType,
      language: source.language,
      season: source.season_number ? String(source.season_number) : '',
      episode: source.episode_number ? String(source.episode_number) : '',
      enabled: source.enabled,
      tmdb_id: null, // Forcer à sélectionner un nouveau média
      tmdb: null,
    });
    setEditingReader(null);
    setDialogOpen(true);
    toast.info('Sélectionnez le média pour lequel dupliquer cette source', { 
      icon: <Info className="w-4 h-4" />,
      duration: 4000 
    });
  };

  const onSelectTMDB = async (item: TMDBResult) => {
    const title = item.media_type === 'movie' ? item.title || '' : item.name || '';
    const baseUrl = formData.baseUrl || `https://streaming.example.com/${item.media_type}/${item.id}`;
    
    setFormData((f) => ({
      ...f,
      label: title,
      baseUrl,
      media_type: item.media_type === 'tv' ? 'series' : (item.media_type as MediaType),
      tmdb_id: item.id,
      tmdb: item,
    }));
    setShowTmdbDropdown(false);
    setTmdbQuery('');
    setTmdbResults([]);

    if (item.media_type === 'tv') {
      try {
        const seasons = await fetchTMDBSeasons(item.id);
        setTmdbSeasons(seasons);
      } catch {
        setTmdbSeasons([]);
      }
    } else {
      setTmdbSeasons([]);
    }
  };

  const fetchByTmdbId = async () => {
    const id = parseInt(tmdbIdInput);
    if (isNaN(id) || id <= 0) {
      toast.warning('ID TMDB invalide');
      return;
    }

    setTmdbLoading(true);
    try {
      const item = await fetchTMDBById(id, tmdbMediaTypeForId);
      if (!item) {
        toast.error('Aucun résultat trouvé pour cet ID');
        return;
      }
      await onSelectTMDB(item);
      toast.success('Film/Série trouvé !');
    } catch (err) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setTmdbLoading(false);
    }
  };

  const previewUrl = useMemo(() => {
    const seasonNum = formData.season ? Number(formData.season) : null;
    const episodeNum = formData.episode ? Number(formData.episode) : null;
    return buildFinalUrl(formData.baseUrl || '', formData.media_type, seasonNum, episodeNum);
  }, [formData.baseUrl, formData.media_type, formData.season, formData.episode]);

  const parseEpisodeUrls = (input: string): string[] => {
    const urls: string[] = [];
    
    const patterns = [
      /var\s+\w+\s*=\s*\[([\s\S]*?)\]/g,
      /const\s+\w+\s*=\s*\[([\s\S]*?)\]/g,
      /let\s+\w+\s*=\s*\[([\s\S]*?)\]/g,
      /\[([\s\S]*?)\]/g,
    ];
    
    let matched = false;
    
    for (const pattern of patterns) {
      const matches = input.matchAll(pattern);
      for (const match of matches) {
        const arrayContent = match[1];
        const urlMatches = arrayContent.match(/['"`](https?:\/\/[^'"`\s,]+)['"`]/g);
        if (urlMatches) {
          matched = true;
          for (const urlMatch of urlMatches) {
            const url = urlMatch.replace(/['"`]/g, '').trim();
            if (url && isValidUrl(url)) {
              urls.push(url);
            }
          }
        }
      }
      if (matched) break;
    }
    
    if (!matched) {
      const lines = input.split(/[\n,]/);
      for (const line of lines) {
        const trimmed = line.replace(/['"`\[\]]/g, '').trim();
        if (trimmed && isValidUrl(trimmed)) {
          urls.push(trimmed);
        }
      }
    }
    
    return [...new Set(urls)];
  };

  const openBulkImportDialog = () => {
    setBulkImportData('');
    setBulkImportLabel('');
    setBulkImportLanguage('VOSTFR');
    setBulkImportSeason('1');
    setBulkImportTmdbId(null);
    setBulkImportTmdb(null);
    setBulkImportProgress({ current: 0, total: 0 });
    setBulkImportDialogOpen(true);
  };

  const handleBulkImport = async () => {
    if (!bulkImportTmdbId) {
      toast.warning('Veuillez sélectionner une série TMDB');
      return;
    }
    if (!bulkImportLabel.trim()) {
      toast.warning('Veuillez entrer un nom de source');
      return;
    }
    
    const urls = parseEpisodeUrls(bulkImportData);
    
    if (urls.length === 0) {
      toast.error('Aucune URL valide trouvée dans les données');
      return;
    }
    
    const seasonNum = parseInt(bulkImportSeason) || 1;
    
    setBulkImporting(true);
    setBulkImportProgress({ current: 0, total: urls.length });
    
    const newReaders: Reader[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (let i = 0; i < urls.length; i++) {
        const episodeNum = i + 1;
        const url = urls[i];
        
        const payload = {
          label: `${bulkImportLabel} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`,
          url: url,
          media_type: 'series' as MediaType,
          language: bulkImportLanguage,
          enabled: true,
          tmdb_id: bulkImportTmdbId,
          season_number: seasonNum,
          episode_number: episodeNum,
        };
        
        try {
          const { data, error } = await supabase.from('readers').insert(payload).select().single();
          if (error) throw error;
          newReaders.push(data as Reader);
          successCount++;
        } catch (err) {
          console.error(`Error importing episode ${episodeNum}:`, err);
          errorCount++;
        }
        
        setBulkImportProgress({ current: i + 1, total: urls.length });
      }
      
      if (successCount > 0) {
        setReaders(prev => [...newReaders, ...prev]);
        toast.success(
          `${successCount} épisodes importés avec succès${errorCount > 0 ? ` (${errorCount} erreurs)` : ''}`,
          { icon: <CheckCircle2 className="w-4 h-4" /> }
        );
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error(`Échec de l'import: ${errorCount} erreurs`);
      }
      
      setBulkImportDialogOpen(false);
      
    } catch (err: any) {
      toast.error(`Erreur lors de l'import: ${err.message || 'inconnue'}`);
    } finally {
      setBulkImporting(false);
    }
  };

  const onSelectBulkTMDB = async (item: TMDBResult) => {
    if (item.media_type !== 'tv') {
      toast.warning('L\'import en masse est uniquement pour les séries TV');
      return;
    }
    
    const title = item.name || '';
    setBulkImportLabel(title);
    setBulkImportTmdbId(item.id);
    setBulkImportTmdb(item);
    setShowTmdbDropdown(false);
    setTmdbQuery('');
    setTmdbResults([]);
    
    try {
      const seasons = await fetchTMDBSeasons(item.id);
      setTmdbSeasons(seasons);
    } catch {
      setTmdbSeasons([]);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Accès refusé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vous devez être connecté pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Accès administrateur requis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder au panneau d'administration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les sources de streaming et les utilisateurs
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Sources totales"
          value={stats.totalReaders}
          icon={<Database className="w-6 h-6" />}
          description={`${stats.readersEnabled} actives`}
        />
        <StatsCard
          title="Liées à TMDB"
          value={stats.readersWithTmdb}
          icon={<Film className="w-6 h-6" />}
          description={`${Math.round((stats.readersWithTmdb / stats.totalReaders) * 100) || 0}% du total`}
        />
        <StatsCard
          title="Utilisateurs"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6" />}
          description={`${stats.adminUsers} admin(s)`}
        />
        <StatsCard
          title="Par type"
          value={`${stats.movieReaders}/${stats.seriesReaders}`}
          icon={<BarChart3 className="w-6 h-6" />}
          description="Films / Séries"
        />
      </div>

      <Tabs defaultValue="readers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="readers" className="gap-2">
            <LinkIcon className="w-4 h-4" />
            Sources ({stats.totalReaders})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs ({stats.totalUsers})
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 relative">
            <Mail className="w-4 h-4" />
            Messages ({stats.totalMessages})
            {stats.pendingMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.pendingMessages}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="readers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Gestion des sources
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ajoutez, modifiez ou supprimez des sources de streaming
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={openBulkImportDialog} variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Import en masse
                  </Button>
                  <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter une source
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, URL, type..."
                    value={searchReaders}
                    onChange={(e) => setSearchReaders(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterMediaType} onValueChange={setFilterMediaType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Type de média" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="movie">Films</SelectItem>
                    <SelectItem value="series">Séries</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEnabled} onValueChange={setFilterEnabled}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="État" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="enabled">Activées</SelectItem>
                    <SelectItem value="disabled">Désactivées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredReaders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucune source trouvée</p>
                  <p className="text-sm">Essayez de modifier vos filtres ou d'ajouter une nouvelle source</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/50">
                        <TableHead>Nom</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Langue</TableHead>
                        <TableHead>TMDB ID</TableHead>
                        <TableHead>S/E</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredReaders.map((reader) => (
                          <ReaderRow
                            key={reader.id}
                            reader={reader}
                            onEdit={openEditDialog}
                            onDelete={deleteReader}
                            onToggle={toggleReader}
                            onCopyUrl={copyUrl}
                            onDuplicate={duplicateSourceForMedia}
                          />
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Utilisateurs et rôles
              </CardTitle>
              <CardDescription className="mt-1">
                Gérez les utilisateurs et leurs permissions admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'utilisateur ou code ami..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/50">
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Code ami</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead className="text-right">Rôle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userData) => (
                        <TableRow key={userData.id} className="hover:bg-secondary/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 text-white flex items-center justify-center font-bold text-lg shadow-md">
                                {userData.username?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{userData.username}</span>
                                  {userData.is_admin && (
                                    <Badge variant="default" className="text-xs gap-1">
                                      <Shield className="w-3 h-3" />
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">{userData.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{userData.friend_code}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {formatDate(userData.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {userData.id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRoleDialog(userData)}
                                className="gap-1"
                              >
                                <Shield className="w-3 h-3" />
                                Gérer le rôle
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Messages de contact
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Consultez et gérez les messages reçus via le formulaire de contact
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchContactMessages} disabled={loadingMessages} className="gap-2">
                  {loadingMessages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMessages ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground mt-2">Chargement des messages...</p>
                </div>
              ) : contactMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucun message</p>
                  <p className="text-sm">Les messages de contact apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        msg.status === 'pending' ? 'border-yellow-500/50 bg-yellow-500/5' :
                        msg.status === 'read' ? 'border-blue-500/50 bg-blue-500/5' :
                        'border-green-500/50 bg-green-500/5'
                      }`}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setMessageDialogOpen(true);
                        if (msg.status === 'pending') {
                          updateMessageStatus(msg.id, 'read');
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(msg.category)}
                            <span className="font-semibold truncate">{msg.subject}</span>
                            <Badge variant={
                              msg.status === 'pending' ? 'secondary' :
                              msg.status === 'read' ? 'outline' :
                              'default'
                            } className="text-xs shrink-0">
                              {msg.status === 'pending' ? 'Nouveau' : msg.status === 'read' ? 'Lu' : 'Répondu'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {msg.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {msg.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Envoyer une notification
              </CardTitle>
              <CardDescription className="mt-1">
                Envoyez des notifications à tous les utilisateurs et optionnellement à Discord
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre de la notification</Label>
                  <Input
                    placeholder="Nouvelle fonctionnalité disponible !"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Message</Label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Décrivez la notification en détail..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de notification</Label>
                  <Select value={notificationType} onValueChange={(v) => setNotificationType(v as 'info' | 'success' | 'warning')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (bleu)</SelectItem>
                      <SelectItem value="success">Succès (vert)</SelectItem>
                      <SelectItem value="warning">Attention (orange)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Discord Webhook URL (optionnel)
                  </Label>
                  <Input
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si fourni, la notification sera aussi envoyée sur votre serveur Discord
                  </p>
                </div>

                <Button 
                  onClick={sendNotification} 
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="w-full gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Envoyer la notification
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingReader ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingReader ? 'Modifier la source' : 'Ajouter une source'}
            </DialogTitle>
            <DialogDescription>
              {editingReader 
                ? 'Modifiez les informations de la source de streaming'
                : 'Ajoutez une nouvelle source de streaming à la base de données'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <Info className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Liaison TMDB obligatoire</p>
                    <p className="text-xs text-muted-foreground">
                      Chaque source doit être liée à un film/série spécifique
                    </p>
                  </div>
                </div>
              </div>

              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Lier à un média TMDB <span className="text-destructive">*</span>
              </Label>
              
              <Tabs value={tmdbSearchMode} onValueChange={(v) => setTmdbSearchMode(v as 'search' | 'id')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Recherche par nom</TabsTrigger>
                  <TabsTrigger value="id">Recherche par ID</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={tmdbSearchTypeFilter} onValueChange={(v: 'all' | 'movie' | 'tv') => setTmdbSearchTypeFilter(v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="movie">Films</SelectItem>
                        <SelectItem value="tv">Séries</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 relative" ref={tmdbRef}>
                      <Input
                        placeholder="Recherchez un film ou une série..."
                        value={tmdbQuery}
                        onChange={(e) => {
                          setTmdbQuery(e.target.value);
                          if (e.target.value.trim()) {
                            setShowTmdbDropdown(true);
                          }
                        }}
                        onFocus={() => tmdbResults.length > 0 && setShowTmdbDropdown(true)}
                      />
                      {tmdbLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}

                    {showTmdbDropdown && tmdbResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-xl max-h-[400px] overflow-y-auto"
                      >
                        {tmdbResults.map((item) => (
                          <div
                            key={`${item.media_type}-${item.id}`}
                            className="flex items-start gap-3 p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-b-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTMDB(item);
                            }}
                          >
                            {item.poster_path ? (
                              <img
                                src={`${TMDB_IMG}/w92${item.poster_path}`}
                                alt=""
                                className="w-14 h-20 object-cover rounded flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-20 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                                <Film className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">
                                  {item.media_type === 'movie' ? item.title : item.name}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {item.media_type === 'movie' ? 'Film' : 'Série'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.release_date || item.first_air_date || 'Date inconnue'}
                              </p>
                              {item.vote_average > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">{item.vote_average.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Filtrez par type et recherchez le titre du film ou de la série
                  </p>
                </TabsContent>

                <TabsContent value="id" className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={tmdbMediaTypeForId} onValueChange={(v: 'movie' | 'tv') => setTmdbMediaTypeForId(v)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Film</SelectItem>
                        <SelectItem value="tv">Série</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="ID TMDB (ex: 533535)"
                      value={tmdbIdInput}
                      onChange={(e) => setTmdbIdInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={fetchByTmdbId} disabled={tmdbLoading}>
                      {tmdbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Entrez l'ID TMDB exact (trouvable sur themoviedb.org dans l'URL)
                  </p>
                </TabsContent>
              </Tabs>

              {formData.tmdb && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                >
                  {formData.tmdb.poster_path ? (
                    <img
                      src={`${TMDB_IMG}/w92${formData.tmdb.poster_path}`}
                      alt=""
                      className="w-16 h-24 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <p className="font-semibold text-sm">Média sélectionné</p>
                        </div>
                        <p className="font-medium">
                          {formData.tmdb.media_type === 'movie' ? formData.tmdb.title : formData.tmdb.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {formData.tmdb.media_type === 'movie' ? 'Film' : 'Série'}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-mono">
                            ID: {formData.tmdb.id}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Cette source ne sera visible que pour ce média
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => {
                          setFormData((f) => ({ ...f, tmdb_id: null, tmdb: null }));
                          setTmdbSeasons([]);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">
                Nom de la source <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                placeholder="ex: Netflix HD VOSTFR"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                URL de base <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baseUrl"
                placeholder="https://example.com/watch"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                L'URL de base sans les segments de saison/épisode
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mediaType">Type de média</Label>
                <Select
                  value={formData.media_type}
                  onValueChange={(value: MediaType) => setFormData({ ...formData, media_type: value })}
                >
                  <SelectTrigger id="mediaType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Film</SelectItem>
                    <SelectItem value="series">Série</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOSTFR">VOSTFR</SelectItem>
                    <SelectItem value="VF">VF</SelectItem>
                    <SelectItem value="VO">VO</SelectItem>
                    <SelectItem value="MULTI">MULTI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.media_type === 'series' || formData.media_type === 'tv' || formData.media_type === 'anime') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="season">Saison</Label>
                  {tmdbSeasons.length > 0 ? (
                    <Select
                      value={formData.season}
                      onValueChange={(value) => setFormData({ ...formData, season: value })}
                    >
                      <SelectTrigger id="season">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tmdbSeasons.map((s) => (
                          <SelectItem key={s.season_number} value={String(s.season_number)}>
                            {s.name || `Saison ${s.season_number}`}
                            {s.episode_count && ` (${s.episode_count} ép.)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="season"
                      type="number"
                      min="0"
                      placeholder="1"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="episode">Épisode</Label>
                  <Input
                    id="episode"
                    type="number"
                    min="0"
                    placeholder="1"
                    value={formData.episode}
                    onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Source activée
                </Label>
                <p className="text-sm text-muted-foreground">
                  La source sera visible pour tous les utilisateurs
                </p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {previewUrl && isValidUrl(previewUrl) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Aperçu de l'URL finale
                </Label>
                <div className="p-3 bg-secondary/50 rounded-lg border">
                  <code className="text-sm break-all">{previewUrl}</code>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={upsertReader} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {editingReader ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import en masse d'épisodes
            </DialogTitle>
            <DialogDescription>
              Importez plusieurs épisodes à la fois en collant un tableau d'URLs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Format accepté</p>
                  <p className="text-xs text-muted-foreground">
                    var eps1 = ['url1', 'url2', ...] ou liste d'URLs
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Sélectionner la série TMDB <span className="text-destructive">*</span>
              </Label>
              <div className="relative" ref={tmdbRef}>
                <Input
                  placeholder="Recherchez une série..."
                  value={tmdbQuery}
                  onChange={(e) => {
                    setTmdbQuery(e.target.value);
                    if (e.target.value.trim()) {
                      setShowTmdbDropdown(true);
                    }
                  }}
                  onFocus={() => tmdbResults.length > 0 && setShowTmdbDropdown(true)}
                />
                {tmdbLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}

                {showTmdbDropdown && tmdbResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-xl max-h-[300px] overflow-y-auto"
                  >
                    {tmdbResults.filter(item => item.media_type === 'tv').map((item) => (
                      <div
                        key={`bulk-${item.media_type}-${item.id}`}
                        className="flex items-start gap-3 p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-b-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBulkTMDB(item);
                        }}
                      >
                        {item.poster_path ? (
                          <img
                            src={`${TMDB_IMG}/w92${item.poster_path}`}
                            alt=""
                            className="w-12 h-18 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                            <Tv className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.first_air_date || 'Date inconnue'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {tmdbResults.filter(item => item.media_type === 'tv').length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Aucune série trouvée. Recherchez un autre terme.
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {bulkImportTmdb && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                {bulkImportTmdb.poster_path ? (
                  <img
                    src={`${TMDB_IMG}/w92${bulkImportTmdb.poster_path}`}
                    alt=""
                    className="w-16 h-24 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-24 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                    <Tv className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="font-semibold text-sm">Série sélectionnée</p>
                      </div>
                      <p className="font-medium">{bulkImportTmdb.name}</p>
                      <Badge variant="outline" className="text-xs font-mono mt-1">
                        ID: {bulkImportTmdb.id}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => {
                        setBulkImportTmdbId(null);
                        setBulkImportTmdb(null);
                        setBulkImportLabel('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkLabel">
                  Nom de la source <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bulkLabel"
                  placeholder="ex: Netflix HD"
                  value={bulkImportLabel}
                  onChange={(e) => setBulkImportLabel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkLanguage">Langue</Label>
                <Select value={bulkImportLanguage} onValueChange={setBulkImportLanguage}>
                  <SelectTrigger id="bulkLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOSTFR">VOSTFR</SelectItem>
                    <SelectItem value="VF">VF</SelectItem>
                    <SelectItem value="VO">VO</SelectItem>
                    <SelectItem value="MULTI">MULTI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkSeason">Numéro de saison</Label>
              {tmdbSeasons.length > 0 ? (
                <Select value={bulkImportSeason} onValueChange={setBulkImportSeason}>
                  <SelectTrigger id="bulkSeason">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tmdbSeasons.map((s) => (
                      <SelectItem key={s.season_number} value={String(s.season_number)}>
                        {s.name || `Saison ${s.season_number}`}
                        {s.episode_count && ` (${s.episode_count} ép.)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="bulkSeason"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={bulkImportSeason}
                  onChange={(e) => setBulkImportSeason(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkData" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                URLs des épisodes <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="bulkData"
                className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                placeholder={`Collez ici vos URLs. Formats acceptés:

var eps1 = [
  'https://example.com/ep1',
  'https://example.com/ep2',
  'https://example.com/ep3'
]

Ou simplement:
https://example.com/ep1
https://example.com/ep2
https://example.com/ep3`}
                value={bulkImportData}
                onChange={(e) => setBulkImportData(e.target.value)}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                L'ordre des URLs détermine le numéro d'épisode (1ère URL = Épisode 1, etc.)
              </p>
              {bulkImportData && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {parseEpisodeUrls(bulkImportData).length} URLs détectées
                  </Badge>
                </div>
              )}
            </div>

            {bulkImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Import en cours...</span>
                  <span>{bulkImportProgress.current}/{bulkImportProgress.total}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setBulkImportDialogOpen(false)}
              disabled={bulkImporting}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={bulkImporting || !bulkImportTmdbId || !bulkImportLabel.trim() || !bulkImportData.trim()} 
              className="gap-2"
            >
              {bulkImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importer les épisodes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gérer le rôle de {selectedUserForRole?.username}
            </DialogTitle>
            <DialogDescription>
              Choisissez le rôle à attribuer à cet utilisateur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="creator">Créateur</SelectItem>
                  <SelectItem value="moderator">Modérateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {selectedRole === 'member' && 'Accès standard à la plateforme'}
                {selectedRole === 'creator' && 'Peut créer du contenu et accéder à des fonctionnalités avancées'}
                {selectedRole === 'moderator' && 'Peut modérer les utilisateurs et le contenu'}
                {selectedRole === 'admin' && 'Accès complet à toutes les fonctionnalités admin'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={updateUserRole} className="gap-2">
              <Save className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMessage && getCategoryIcon(selectedMessage.category)}
              {selectedMessage?.subject || 'Message'}
            </DialogTitle>
            <DialogDescription>
              Message reçu le {selectedMessage ? formatDate(selectedMessage.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getCategoryLabel(selectedMessage.category)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedMessage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${selectedMessage.email}`} 
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedMessage.email}
                  </a>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Statut:</Label>
                  <Select 
                    value={selectedMessage.status} 
                    onValueChange={(v) => updateMessageStatus(selectedMessage.id, v as any)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="read">Lu</SelectItem>
                      <SelectItem value="replied">Répondu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`, '_blank')}
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Répondre
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;