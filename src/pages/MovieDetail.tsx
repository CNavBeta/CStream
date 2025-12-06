// src/pages/MovieDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tmdbApi } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { MediaGrid } from '@/components/MediaGrid';
import { TrailerModal } from '@/components/TrailerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, Star, Clock, Calendar, Heart, Bookmark, Share2, 
  ChevronLeft, X, Loader2, ThumbsUp, Eye, MessageSquare,
  Send, Globe, User, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ============================ Types ============================ */
interface Reader {
  id: string;
  label: string;
  url: string;
  media_type: string;
  language: string;
  tmdb_id?: number | null;
  season_number?: number | null;
  episode_number?: number | null;
  enabled?: boolean | null;
  order_index?: number | null;
}

interface Comment {
  id: number;
  user: string;
  lang: string;
  text: string;
  rating: number;
  isAdmin: boolean;
  timestamp: number;
  likes: number;
  userLiked?: boolean;
}

interface TMDBMovie {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    crew?: Array<{ job: string; name: string; id: number }>;
    cast?: Array<{ 
      id: number; 
      name: string; 
      character: string; 
      profile_path?: string 
    }>;
  };
  videos?: {
    results?: Array<{ 
      key: string; 
      type: string; 
      site: string 
    }>;
  };
  recommendations?: {
    results?: any[];
  };
  season_number?: number | null;
  episode_number?: number | null;
}

/* ============================ Utilitaires ============================ */
const PROXY_BASE = typeof import.meta.env?.VITE_PROXY_BASE === 'string' 
  ? import.meta.env.VITE_PROXY_BASE 
  : '';

const normalizeBaseUrl = (url: string): string => {
  if (!url) return url;
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const buildFinalUrl = (baseUrl: string, reader: Reader, movie: TMDBMovie): string => {
  const base = normalizeBaseUrl(baseUrl);
  const season = reader?.season_number ?? movie?.season_number ?? null;
  const episode = reader?.episode_number ?? movie?.episode_number ?? null;

  if (!season && !episode) return base;

  const parts: string[] = [base];
  if (season) parts.push(`season/${season}`);
  if (episode) parts.push(`episode/${episode}`);
  return parts.join('/');
};

const formatDuration = (minutes?: number | null): string => {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

/* ============================ Composant principal ============================ */
const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // États principaux
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingSource, setFindingSource] = useState(false);

  // Mode lecture
  const [isWatching, setIsWatching] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(true);
  const [currentSource, setCurrentSource] = useState<Reader | null>(null);

  // Modal sources
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [candidates, setCandidates] = useState<Reader[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Favoris & Interactions
  const [isFavorite, setIsFavorite] = useState(false);
  const [userLiked, setUserLiked] = useState(false);

  // Trailer modal
  const [trailerOpen, setTrailerOpen] = useState(false);

  // Commentaires
  const [comments, setComments] = useState<Comment[]>([
    { 
      id: 1, 
      user: 'Jean Dupont', 
      lang: 'Français', 
      text: "Très bon film, j'ai adoré l'intrigue et les personnages. Les acteurs sont excellents et la réalisation est impeccable.", 
      rating: 5, 
      isAdmin: false,
      timestamp: Date.now() - 86400000 * 2,
      likes: 12,
      userLiked: false
    },
    { 
      id: 2, 
      user: 'Anna Smith', 
      lang: 'English', 
      text: 'Une expérience visuelle incroyable, je recommande ! The cinematography is breathtaking.', 
      rating: 4, 
      isAdmin: true,
      timestamp: Date.now() - 3600000 * 5,
      likes: 24,
      userLiked: false
    },
    { 
      id: 3, 
      user: 'Carlos Rodriguez', 
      lang: 'Español', 
      text: '¡Increíble película! La trama es fascinante y los efectos especiales son de primer nivel.', 
      rating: 5, 
      isAdmin: false,
      timestamp: Date.now() - 3600000 * 12,
      likes: 8,
      userLiked: false
    },
  ]);
  const [newComment, setNewComment] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newLang, setNewLang] = useState('Français');
  const [newRating, setNewRating] = useState(5);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Statistiques
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);

  // Charger les détails du film
  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await tmdbApi.getMovieDetails(parseInt(id));
        setMovie(data);
        setLikes(data.vote_count ? data.vote_count * 10 : 156);
        setViews(data.vote_count ? data.vote_count * 100 : 2847);
      } catch (err) {
        console.error('Failed to fetch movie:', err);
        toast.error('Impossible de charger les détails du film.');
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Charger favoris et likes
  useEffect(() => {
    if (!id) return;
    try {
      const favs = JSON.parse(localStorage.getItem('favorites_v1') || '[]') as string[];
      setIsFavorite(favs.includes(id));
      
      const liked = localStorage.getItem(`liked_${id}`) === 'true';
      setUserLiked(liked);
    } catch {
      setIsFavorite(false);
      setUserLiked(false);
    }
  }, [id]);

  // Toggle favori
  const toggleFavorite = useCallback(() => {
    if (!id) return;
    try {
      const favs = JSON.parse(localStorage.getItem('favorites_v1') || '[]') as string[];
      const exists = favs.includes(id);
      const next = exists ? favs.filter((x) => x !== id) : [id, ...favs];
      localStorage.setItem('favorites_v1', JSON.stringify(next));
      setIsFavorite(!exists);
      toast.success(exists ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch {
      toast.error('Impossible de mettre à jour les favoris');
    }
  }, [id]);

  // Toggle like
  const toggleLike = useCallback(() => {
    if (!id) return;
    const liked = localStorage.getItem(`liked_${id}`) === 'true';
    localStorage.setItem(`liked_${id}`, (!liked).toString());
    setUserLiked(!liked);
    setLikes(prev => liked ? prev - 1 : prev + 1);
    toast.success(liked ? 'Like retiré' : 'Liked !');
  }, [id]);

  // Like commentaire
  const toggleCommentLike = useCallback((commentId: number) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const newLiked = !c.userLiked;
        return {
          ...c,
          userLiked: newLiked,
          likes: newLiked ? c.likes + 1 : c.likes - 1
        };
      }
      return c;
    }));
  }, []);

  // Rechercher sources
  const fetchCandidates = useCallback(
    async (movieObj: TMDBMovie): Promise<Reader[]> => {
      setSourcesLoading(true);
      try {
        const tmdbId = movieObj?.id;
        let { data: readersByTmdb, error: errTmdb } = await supabase
          .from('readers')
          .select('*')
          .eq('enabled', true)
          .eq('tmdb_id', tmdbId)
          .order('order_index', { ascending: true });

        if (errTmdb) console.warn('Supabase tmdb lookup error', errTmdb);

        let list: Reader[] = (readersByTmdb || []) as Reader[];

        if (!list.length) {
          const { data: readersByType, error: errType } = await supabase
            .from('readers')
            .select('*')
            .eq('enabled', true)
            .ilike('media_type', 'movie')
            .order('order_index', { ascending: true });

          if (errType) console.warn('Supabase type lookup error', errType);
          list = (readersByType || []) as Reader[];
        }

        setCandidates(list);
        return list;
      } catch (err) {
        console.error('fetchCandidates error', err);
        toast.error('Erreur lors de la recherche de sources.');
        return [];
      } finally {
        setSourcesLoading(false);
      }
    },
    []
  );

  // Ouvrir modal sources
  const openSourcesModal = useCallback(async () => {
    if (!movie) return;
    setSourcesOpen(true);
    await fetchCandidates(movie);
  }, [movie, fetchCandidates]);

  // Lancer la lecture
  const handleChooseAndWatch = useCallback(
    (reader: Reader) => {
      if (!movie) return;
      const finalUrl = buildFinalUrl(reader.url, reader, movie);
      if (!finalUrl) {
        toast.error('URL invalide pour cette source.');
        return;
      }

      const proxyUrl = PROXY_BASE 
        ? `${PROXY_BASE}${encodeURIComponent(finalUrl)}` 
        : finalUrl;

      setCurrentVideoUrl(proxyUrl);
      setCurrentSource(reader);
      setIsWatching(true);
      setVideoLoading(true);
      setSourcesOpen(false);
      toast.success(`Lecture via ${reader.label}`);
      
      setTimeout(() => setVideoLoading(false), 1500);
    },
    [movie]
  );

  // Bouton "Regarder" rapide
  const handleWatchQuick = useCallback(async () => {
    if (!movie) return;
    setFindingSource(true);
    const loadingToast = toast.loading('Recherche de sources...');

    try {
      const list = await fetchCandidates(movie);
      
      if (!list.length) {
        toast.error('Aucune source disponible pour ce film.');
        return;
      }

      if (list.length > 1) {
        setSourcesOpen(true);
        return;
      }

      handleChooseAndWatch(list[0]);
      toast.success('Source trouvée, lecture en cours...');
    } catch (err: any) {
      console.error('Erreur handleWatch:', err);
      toast.error(err?.message || 'Impossible de trouver une source.');
    } finally {
      setFindingSource(false);
      toast.dismiss(loadingToast);
    }
  }, [movie, fetchCandidates, handleChooseAndWatch]);

  // Partager
  const handleShare = useCallback(async () => {
    if (!movie) return;
    const shareData = {
      title: movie.title,
      text: `Regarde ${movie.title} - ${movie.tagline || 'Un film incroyable !'}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Partagé avec succès !');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Lien copié dans le presse-papiers');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  }, [movie]);

  // Ajouter commentaire
  const addComment = useCallback(() => {
    if (!newUser.trim() || !newComment.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const nextId = comments.length ? Math.max(...comments.map(c => c.id)) + 1 : 1;
    const newCommentObj: Comment = {
      id: nextId,
      user: newUser.trim(),
      lang: newLang,
      text: newComment.trim(),
      rating: newRating,
      isAdmin: false,
      timestamp: Date.now(),
      likes: 0,
      userLiked: false
    };

    setComments([newCommentObj, ...comments]);
    setNewComment('');
    setNewUser('');
    setNewLang('Français');
    setNewRating(5);
    setShowCommentForm(false);
    toast.success('Commentaire ajouté !');
  }, [comments, newUser, newComment, newLang, newRating]);

  /* ============================ Render ============================ */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">Film non trouvé</p>
          <Button onClick={() => navigate('/movies')}>
            Retour aux films
          </Button>
        </div>
      </div>
    );
  }

  const directors = movie.credits?.crew?.filter((c) => c.job === 'Director') || [];
  const castList = movie.credits?.cast?.slice(0, 12) || [];
  const trailer = movie.videos?.results?.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Mode Lecture */}
      {isWatching ? (
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setIsWatching(false)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold truncate">{movie.title}</h1>
            </div>
            <Button variant="outline" onClick={openSourcesModal}>
              Changer de source
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lecteur */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="overflow-hidden">
                <div className="bg-black relative aspect-video">
                  {videoLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                      <span className="text-white text-sm">Chargement du lecteur...</span>
                      {currentSource && (
                        <span className="text-white/70 text-xs mt-1">
                          Source: {currentSource.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <iframe
                      src={currentVideoUrl}
                      className="w-full h-full"
                      allowFullScreen
                      scrolling="no"
                      frameBorder="0"
                      title={movie.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  )}
                </div>
                {currentSource && !videoLoading && (
                  <CardContent className="p-3 bg-secondary/20">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{currentSource.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {currentSource.language}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={openSourcesModal}
                      >
                        Changer
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Interactions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant={userLiked ? "default" : "outline"}
                        size="sm"
                        onClick={toggleLike}
                        className="gap-2"
                      >
                        <ThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
                        {likes}
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        {views} vues
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        {comments.length} avis
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleFavorite}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Synopsis */}
              {movie.overview && (
                <Card>
                  <CardHeader>
                    <CardTitle>Synopsis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{movie.overview}</p>
                  </CardContent>
                </Card>
              )}

              {/* Distribution */}
              {castList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {castList.slice(0, 8).map((actor) => (
                        <div key={actor.id} className="text-center">
                          {actor.profile_path ? (
                            <img
                              src={tmdbApi.getImageUrl(actor.profile_path, 'w185')}
                              alt={actor.name}
                              className="w-full aspect-[2/3] rounded-md mb-2 object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-secondary/20 rounded-md mb-2 flex items-center justify-center">
                              <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-sm font-medium">{actor.name}</p>
                          <p className="text-xs text-muted-foreground">{actor.character}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommandations */}
              {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vous pourriez aussi aimer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {movie.recommendations.results.slice(0, 6).map((rec: any) => (
                        <Link 
                          key={rec.id} 
                          to={`/movie/${rec.id}`}
                          className="group"
                        >
                          {rec.poster_path ? (
                            <img
                              src={tmdbApi.getImageUrl(rec.poster_path, 'w185')}
                              alt={rec.title}
                              className="w-full aspect-[2/3] rounded-md mb-2 object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-secondary/20 rounded-md mb-2" />
                          )}
                          <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                            {rec.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Commentaires */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      <CardTitle>Avis des utilisateurs ({comments.length})</CardTitle>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowCommentForm(!showCommentForm)}
                    >
                      {showCommentForm ? 'Annuler' : 'Ajouter un avis'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatePresence>
                    {showCommentForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mb-6 p-4 border rounded-lg bg-secondary/20"
                      >
                        <h3 className="font-semibold flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Nouvel avis
                        </h3>
                        <input
                          type="text"
                          placeholder="Votre nom"
                          value={newUser}
                          onChange={(e) => setNewUser(e.target.value)}
                          className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                        />
                        <select
                          value={newLang}
                          onChange={(e) => setNewLang(e.target.value)}
                          className="w-full p-3 border rounded-md bg-background"
                        >
                          <option>Français</option>
                          <option>English</option>
                          <option>Español</option>
                          <option>Deutsch</option>
                          <option>Italiano</option>
                          <option>Português</option>
                          <option>日本語</option>
                          <option>한국어</option>
                        </select>
                        <textarea
                          placeholder="Votre commentaire (minimum 10 caractères)"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                          rows={4}
                        />
                        <div>
                          <label className="block mb-2 text-sm font-medium">
                            Note: {newRating}/5
                          </label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setNewRating(star)}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`w-8 h-8 cursor-pointer transition-colors ${
                                    star <= newRating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground hover:text-yellow-400'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button onClick={addComment} className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Publier mon avis
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b pb-4 last:border-0"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{comment.user}</p>
                                  {comment.isAdmin && (
                                    <Badge variant="default" className="text-xs">Admin</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Globe className="w-3 h-3" />
                                  <span>{comment.lang}</span>
                                  <span>•</span>
                                  <span>{formatDate(comment.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm mb-3 leading-relaxed">{comment.text}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < comment.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant={comment.userLiked ? "default" : "ghost"}
                              onClick={() => toggleCommentLike(comment.id)}
                              className="gap-1"
                            >
                              <ThumbsUp className={`w-3 h-3 ${comment.userLiked ? 'fill-current' : ''}`} />
                              {comment.likes}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Aucun avis disponible. Soyez le premier à donner votre avis !
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Info */}
            <aside className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informations</CardTitle>
                </CardHeader>
                <CardContent>
                  {movie.poster_path ? (
                    <img
                      src={tmdbApi.getImageUrl(movie.poster_path, 'w500')}
                      alt={movie.title}
                      className="w-full rounded-md mb-3 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-secondary/20 rounded-md mb-3" />
                  )}

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Titre</p>
                      <p className="font-semibold">{movie.title}</p>
                    </div>
                    {movie.tagline && (
                      <p className="text-xs italic text-muted-foreground border-l-2 border-primary pl-2">
                        "{movie.tagline}"
                      </p>
                    )}
                    {directors.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Réalisateur</p>
                        <p className="font-medium">{directors.map((d) => d.name).join(', ')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Durée</p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">{formatDuration(movie.runtime)}</span>
                      </div>
                    </div>
                    {movie.release_date && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Date de sortie</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {new Date(movie.release_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Note TMDB</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">
                          {movie.vote_average ? movie.vote_average.toFixed(1) : '—'}
                        </span>
                        <span className="text-muted-foreground">/ 10</span>
                      </div>
                      {movie.vote_count && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ({movie.vote_count.toLocaleString()} votes)
                        </p>
                      )}
                    </div>
                    {movie.genres && movie.genres.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Genres</p>
                        <div className="flex flex-wrap gap-1">
                          {movie.genres.map((genre) => (
                            <Badge key={genre.id} variant="secondary" className="text-xs">
                              {genre.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {trailer && (
                    <Button
                      asChild
                      className="w-full mt-4"
                      variant="outline"
                    >
                      <a
                        href={`https://www.youtube.com/watch?v=${trailer.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Bande-annonce
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Statistiques */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <ThumbsUp className="w-5 h-5 text-red-500" />
                      <span>Likes</span>
                    </div>
                    <span className="font-bold">{likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-5 h-5 text-blue-500" />
                      <span>Vues</span>
                    </div>
                    <span className="font-bold">{views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-5 h-5 text-green-500" />
                      <span>Commentaires</span>
                    </div>
                    <span className="font-bold">{comments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Heart className="w-5 h-5 text-pink-500" />
                      <span>Favoris</span>
                    </div>
                    <span className="font-bold">{isFavorite ? 'Oui' : 'Non'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Conseils */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conseils</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Utilisez le bouton "Retour" pour revenir aux détails</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Changez de source si le lecteur ne fonctionne pas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Partagez le film avec vos amis via le bouton de partage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Laissez un avis pour aider les autres utilisateurs</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      ) : (
        /* Mode Détails */
        <>
          {/* Hero Section */}
          <section className="relative min-h-[60vh] overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${tmdbApi.getImageUrl(movie.backdrop_path, 'original')})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>

            <div className="relative container mx-auto px-4 py-12">
              <Link
                to="/movies"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour aux films
              </Link>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Poster */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-shrink-0"
                >
                  <img
                    src={tmdbApi.getImageUrl(movie.poster_path, 'w500')}
                    alt={movie.title}
                    className="w-64 rounded-xl shadow-2xl"
                    loading="lazy"
                  />
                </motion.div>

                {/* Infos */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex-1"
                >
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>
                  {movie.tagline && (
                    <p className="text-xl text-muted-foreground italic mb-4">{movie.tagline}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    {movie.vote_average && movie.vote_average > 0 && (
                      <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    {movie.release_date && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                      </div>
                    )}
                    {movie.runtime && movie.runtime > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(movie.runtime)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres?.map((genre) => (
                      <Badge key={genre.id} variant="secondary">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                    {movie.overview}
                  </p>

                  {directors.length > 0 && (
                    <p className="text-sm text-muted-foreground mb-6">
                      <span className="font-medium text-foreground">Réalisateur:</span>{' '}
                      {directors.map((d) => d.name).join(', ')}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={handleWatchQuick}
                      disabled={findingSource}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      {findingSource ? 'Recherche...' : 'Regarder'}
                    </Button>

                    <Button size="lg" variant="outline" onClick={openSourcesModal}>
                      <Globe className="w-5 h-5 mr-2" />
                      Sources
                    </Button>

                    {trailer && (
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => setTrailerOpen(true)}
                        className="gap-2"
                      >
                        <Play className="w-5 h-5" />
                        Bande-annonce
                      </Button>
                    )}

                    <Button
                      size="lg"
                      variant={userLiked ? "default" : "ghost"}
                      onClick={toggleLike}
                      className="gap-2"
                    >
                      <ThumbsUp className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} />
                      {userLiked ? 'Liké' : 'Like'}
                    </Button>

                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={toggleFavorite}
                      aria-pressed={isFavorite}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isFavorite ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                    </Button>

                    <Button size="lg" variant="ghost" onClick={handleShare}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Stats rapides */}
                  <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{likes.toLocaleString()} likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{views.toLocaleString()} vues</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{comments.length} avis</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Distribution */}
          {castList.length > 0 && (
            <section className="py-12">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold mb-6">Distribution</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {castList.map((person) => (
                    <Link key={person.id} to={`/person/${person.id}`} className="group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                        {person.profile_path ? (
                          <img
                            src={tmdbApi.getImageUrl(person.profile_path, 'w300')}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {person.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{person.character}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recommandations */}
          {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
            <section className="py-12 bg-secondary/30">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold mb-6">Recommandations</h2>
                <MediaGrid
                  items={movie.recommendations.results.slice(0, 12)}
                  mediaType="movie"
                />
              </div>
            </section>
          )}

          {/* Modal Sources - AMÉLIORÉ avec filtrage strict par tmdb_id */}
          <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Sources disponibles pour ce film
                  </DialogTitle>
                  <button
                    onClick={() => setSourcesOpen(false)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {sourcesLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-muted-foreground">Recherche des sources...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vérification des lecteurs compatibles avec ce film
                    </p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-8 text-center">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-2">Aucune source trouvée</p>
                    <p className="text-sm text-muted-foreground">
                      Aucun lecteur n'est configuré pour ce film spécifique.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ID TMDB: {movie.id}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      {candidates.length} source{candidates.length > 1 ? 's' : ''} trouvée{candidates.length > 1 ? 's' : ''}
                    </div>
                    <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
                      {candidates.map((r, index) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between gap-4 border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{r.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {r.language}
                              </Badge>
                              {r.tmdb_id === movie.id && (
                                <Badge variant="default" className="text-xs">
                                  Spécifique
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Type: {r.media_type}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-md">
                              {r.url}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleChooseAndWatch(r)}
                              className="gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Regarder
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Trailer Modal */}
          <TrailerModal
            open={trailerOpen}
            onOpenChange={setTrailerOpen}
            trailerKey={trailer?.key || null}
            title={`${movie.title} - Bande-annonce`}
          />
        </>
      )}
    </div>
  );
};

export default MovieDetail;