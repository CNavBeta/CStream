import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/RoleBadge';
import { 
  User, Camera, Save, Loader2, Heart, History, Film, Tv, 
  Star, Clock, Copy, Check, Edit2, X, Upload, Trash2, RefreshCw, ImagePlus,
  Share2, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { tmdbApi } from '@/lib/tmdb';

interface ProfileData {
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  friend_code: string;
}

interface FavoriteItem {
  id: string;
  media_id: string;
  media_type: string;
  created_at: string;
  tmdb_data?: {
    title?: string;
    name?: string;
    poster_path?: string;
    vote_average?: number;
  };
}

interface HistoryItem {
  id: string;
  tmdb_id: number;
  media_type: string;
  progress: number | null;
  updated_at: string | null;
  tmdb_data?: {
    title?: string;
    name?: string;
    poster_path?: string;
    vote_average?: number;
  };
}

const Profile = () => {
  const { user, refreshFriendCode, profile: authProfile, role } = useAuth();
  const navigate = useNavigate();
  const { userId: viewingUserId } = useParams<{ userId?: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;
  const targetUserId = viewingUserId || user?.id;
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [refreshingCode, setRefreshingCode] = useState(false);
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [stats, setStats] = useState({
    moviesWatched: 0,
    tvWatched: 0,
    favorites: 0,
  });

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .eq('id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116' && isOwnProfile && user) {
          const friendCode = String(Math.floor(10000 + Math.random() * 90000));
          const defaultUsername = user.email?.split('@')[0] || `user_${friendCode}`;
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: defaultUsername,
              friend_code: friendCode,
              avatar_url: null,
            } as any)
            .select('id, username, avatar_url, friend_code')
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            toast.error('Erreur lors de la création du profil');
            return;
          }

          setProfile({ 
            username: newProfile.username || '', 
            avatar_url: newProfile.avatar_url,
            banner_url: null,
            friend_code: newProfile.friend_code || ''
          });
          setUsername(newProfile.username || '');
          toast.success('Bienvenue ! Votre profil a été créé.');
          return;
        }
        throw error;
      }

      setProfile({ 
        username: data.username || '', 
        avatar_url: data.avatar_url,
        banner_url: null,
        friend_code: data.friend_code || ''
      });
      setUsername(data.username || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile, user]);

  const fetchFavorites = useCallback(async () => {
    if (!targetUserId) return;
    setLoadingFavorites(true);

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const favoritesWithTmdb = await Promise.all(
        (data || []).map(async (fav) => {
          try {
            const tmdbId = parseInt(fav.media_id);
            if (isNaN(tmdbId)) return { ...fav, tmdb_data: null };
            
            const tmdbData = fav.media_type === 'movie' 
              ? await tmdbApi.getMovieDetails(tmdbId)
              : await tmdbApi.getTVDetails(tmdbId);
            
            return { ...fav, tmdb_data: tmdbData };
          } catch {
            return { ...fav, tmdb_data: null };
          }
        })
      );

      setFavorites(favoritesWithTmdb);
      setStats(prev => ({ ...prev, favorites: data?.length || 0 }));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }, [targetUserId]);

  const fetchHistory = useCallback(async () => {
    if (!targetUserId) return;
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const historyWithTmdb = await Promise.all(
        (data || []).map(async (item) => {
          try {
            const tmdbData = item.media_type === 'movie' 
              ? await tmdbApi.getMovieDetails(item.tmdb_id)
              : await tmdbApi.getTVDetails(item.tmdb_id);
            
            return { ...item, tmdb_data: tmdbData };
          } catch {
            return { ...item, tmdb_data: null };
          }
        })
      );

      setHistory(historyWithTmdb);
      
      const movieCount = (data || []).filter(h => h.media_type === 'movie').length;
      const tvCount = (data || []).filter(h => h.media_type === 'tv').length;
      setStats(prev => ({ ...prev, moviesWatched: movieCount, tvWatched: tvCount }));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (!user && !viewingUserId) {
      navigate('/auth');
      return;
    }
    if (targetUserId) {
      fetchProfile();
      fetchFavorites();
      fetchHistory();
    }
  }, [user, viewingUserId, targetUserId, navigate, fetchProfile, fetchFavorites, fetchHistory]);

  const handleSave = async () => {
    if (!user) return;
    if (!username.trim()) {
      toast.error("Le nom d'utilisateur ne peut pas être vide");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour');
      setProfile((prev) => prev ? { ...prev, username: username.trim() } : null);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || (uploadError as any).statusCode === '404') {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: dataUrl })
              .eq('id', user.id);

            if (updateError) {
              toast.error('Impossible de sauvegarder l\'avatar');
              return;
            }

            setProfile(prev => prev ? { ...prev, avatar_url: dataUrl } : null);
            toast.success('Photo de profil mise à jour (stockage local)');
          };
          reader.readAsDataURL(file);
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 10 Mo');
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || (uploadError as any).statusCode === '404') {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ banner_url: dataUrl })
              .eq('id', user.id);

            if (updateError) {
              toast.error('Impossible de sauvegarder la bannière');
              return;
            }

            setProfile(prev => prev ? { ...prev, banner_url: dataUrl } : null);
            toast.success('Bannière mise à jour');
          };
          reader.readAsDataURL(file);
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, banner_url: urlData.publicUrl } : null);
      toast.success('Bannière mise à jour');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Erreur lors du téléchargement de la bannière');
    } finally {
      setUploadingBanner(false);
    }
  };

  const copyFriendCode = async () => {
    if (!profile?.friend_code) return;
    
    try {
      await navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      toast.success('ID copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const copyShareLink = async () => {
    if (!user) return;
    
    const shareUrl = `${window.location.origin}/add-friend/${user.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Lien de partage copié !');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const shareProfile = async () => {
    if (!user) return;
    
    const shareUrl = `${window.location.origin}/add-friend/${user.id}`;
    const shareData = {
      title: `Ajoutez ${username} sur CStream`,
      text: `Rejoignez-moi sur CStream !`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Partagé !');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Lien copié !');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRefreshFriendCode = async () => {
    setRefreshingCode(true);
    try {
      const { error, newCode } = await refreshFriendCode();
      if (error) {
        toast.error(error.message);
      } else if (newCode) {
        setProfile(prev => prev ? { ...prev, friend_code: newCode } : null);
        toast.success(`Nouvel ID : ${newCode}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du rafraîchissement');
    } finally {
      setRefreshingCode(false);
    }
  };

  const getRemainingRefreshes = () => {
    if (!authProfile) return 3;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const lastRefreshMonth = authProfile.last_friend_code_refresh
      ? `${new Date(authProfile.last_friend_code_refresh).getFullYear()}-${new Date(authProfile.last_friend_code_refresh).getMonth()}`
      : null;
    
    if (lastRefreshMonth !== currentMonth) {
      return 3;
    }
    return Math.max(0, 3 - (authProfile.friend_code_refreshes || 0));
  };

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      setStats(prev => ({ ...prev, favorites: prev.favorites - 1 }));
      toast.success('Retiré des favoris');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{isOwnProfile ? 'Mon Profil' : `Profil de ${username}`}</h1>
            <p className="text-muted-foreground">
              {isOwnProfile ? 'Gérez votre compte et consultez votre activité' : 'Consultez son activité'}
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="overflow-hidden">
                  <div className="h-32 bg-gradient-to-r from-primary via-accent to-primary" />
                  <CardContent className="relative pt-0">
                    <div className="flex flex-col items-center -mt-12">
                      <div 
                        className={`relative ${isOwnProfile ? 'group cursor-pointer' : ''}`}
                        onClick={isOwnProfile ? handleAvatarClick : undefined}
                      >
                        <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                          <AvatarImage src={profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                            {username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {isOwnProfile && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                            {uploading ? (
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            ) : (
                              <Camera className="w-6 h-6 text-white" />
                            )}
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                      
                      <div className="mt-4 text-center">
                        {isOwnProfile && editing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-40 text-center"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" onClick={handleSave} disabled={saving}>
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-500" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setUsername(profile?.username || ''); }}>
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <h2 className="text-xl font-bold">{username}</h2>
                            {isOwnProfile && (
                              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                                <Edit2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        )}
                        {isOwnProfile && user && <p className="text-sm text-muted-foreground">{user.email}</p>}
                        {role && role !== 'member' && (
                          <div className="mt-2">
                            <RoleBadge role={role} size="md" />
                          </div>
                        )}
                      </div>

                      {isOwnProfile && (
                        <div className="mt-4 w-full space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Lien de partage</p>
                              <p className="text-sm text-muted-foreground truncate">
                                Partagez ce lien pour ajouter des amis instantanément
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button size="icon" variant="ghost" onClick={copyShareLink} title="Copier le lien">
                                {copiedLink ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <LinkIcon className="w-4 h-4" />
                                )}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={shareProfile} title="Partager">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {profile?.friend_code && (
                            <>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                <div>
                                  <p className="text-xs text-muted-foreground">Mon ID (5 chiffres)</p>
                                  <p className="font-mono font-bold text-2xl text-primary tracking-widest">{profile.friend_code}</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={copyFriendCode} title="Copier l'ID">
                                    {copied ? (
                                      <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={handleRefreshFriendCode}
                                  disabled={refreshingCode || getRemainingRefreshes() === 0}
                                  title={`Changer l'ID (${getRemainingRefreshes()}/3 restants ce mois)`}
                                >
                                  {refreshingCode ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                              {getRemainingRefreshes()}/3 changements restants ce mois
                            </p>
                          </>
                        )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-500/10">
                            <Film className="w-5 h-5 text-red-500" />
                          </div>
                          <span>Films vus</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{stats.moviesWatched}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Tv className="w-5 h-5 text-blue-500" />
                          </div>
                          <span>Séries suivies</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{stats.tvWatched}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-pink-500/10">
                            <Heart className="w-5 h-5 text-pink-500" />
                          </div>
                          <span>Favoris</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{stats.favorites}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="h-full">
                <Tabs defaultValue="favorites" className="h-full">
                  <CardHeader className="pb-0">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="favorites" className="gap-2">
                        <Heart className="w-4 h-4" />
                        Favoris
                      </TabsTrigger>
                      <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Historique
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <TabsContent value="favorites" className="mt-0">
                      {loadingFavorites ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : favorites.length === 0 ? (
                        <div className="text-center py-12">
                          <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                          <p className="text-muted-foreground">Aucun favori pour le moment</p>
                          <Button variant="link" onClick={() => navigate('/movies')}>
                            Découvrir des films
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {favorites.map((fav) => (
                            <motion.div
                              key={fav.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="group relative"
                            >
                              <Link to={`/${fav.media_type}/${fav.media_id}`}>
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                                  {fav.tmdb_data?.poster_path ? (
                                    <img
                                      src={tmdbApi.getImageUrl(fav.tmdb_data.poster_path, 'w300')}
                                      alt={fav.tmdb_data.title || fav.tmdb_data.name}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  {fav.tmdb_data?.vote_average && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-xs">
                                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                      {fav.tmdb_data.vote_average.toFixed(1)}
                                    </div>
                                  )}
                                  <Badge 
                                    className="absolute top-2 left-2 text-xs"
                                    variant={fav.media_type === 'movie' ? 'default' : 'secondary'}
                                  >
                                    {fav.media_type === 'movie' ? 'Film' : 'Série'}
                                  </Badge>
                                </div>
                              </Link>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFavorite(fav.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <p className="mt-2 text-sm font-medium line-clamp-1">
                                {fav.tmdb_data?.title || fav.tmdb_data?.name || 'Sans titre'}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : history.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                          <p className="text-muted-foreground">Aucun historique pour le moment</p>
                          <Button variant="link" onClick={() => navigate('/movies')}>
                            Commencer à regarder
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {history.map((item) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <Link 
                                to={`/${item.media_type}/${item.tmdb_id}`}
                                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                              >
                                <div className="w-16 h-24 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                                  {item.tmdb_data?.poster_path ? (
                                    <img
                                      src={tmdbApi.getImageUrl(item.tmdb_data.poster_path, 'w200')}
                                      alt={item.tmdb_data.title || item.tmdb_data.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                    {item.tmdb_data?.title || item.tmdb_data?.name || 'Sans titre'}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.media_type === 'movie' ? 'Film' : 'Série'}
                                    </Badge>
                                    {item.tmdb_data?.vote_average && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        {item.tmdb_data.vote_average.toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                  {item.progress !== null && item.progress > 0 && (
                                    <div className="mt-2">
                                      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary rounded-full"
                                          style={{ width: `${Math.min(100, item.progress)}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {item.progress}% regardé
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.updated_at && new Date(item.updated_at).toLocaleDateString('fr-FR')}
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
