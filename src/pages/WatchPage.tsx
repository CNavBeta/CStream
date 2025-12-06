// src/pages/MovieDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tmdbApi } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { MediaGrid } from '@/components/MediaGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, Star, Clock, Calendar, Heart, Bookmark, Share2, 
  ChevronLeft, X, Loader2, ThumbsUp, Eye, MessageSquare 
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

const buildFinalUrl = (
  baseUrl: string, 
  reader: Reader, 
  movie: TMDBMovie
): string => {
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

  // Modal sources
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [candidates, setCandidates] = useState<Reader[]>([]);
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Favoris
  const [isFavorite, setIsFavorite] = useState(false);

  // Commentaires
  const [comments, setComments] = useState<Comment[]>([
    { 
      id: 1, 
      user: 'Jean Dupont', 
      lang: 'Français', 
      text: "Très bon film, j'ai adoré l'intrigue et les personnages.", 
      rating: 5, 
      isAdmin: false 
    },
    { 
      id: 2, 
      user: 'Anna Smith', 
      lang: 'Anglais', 
      text: 'Une expérience visuelle incroyable, je recommande !', 
      rating: 4, 
      isAdmin: true 
    },
  ]);
  const [newComment, setNewComment] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newLang, setNewLang] = useState('Français');
  const [newRating, setNewRating] = useState(5);

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
        setLikes(data.vote_count ? data.vote_count * 10 : 0);
        setViews(data.vote_count ? data.vote_count * 100 : 0);
      } catch (err) {
        console.error('Failed to fetch movie:', err);
        toast.error('Impossible de charger les détails du film.');
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Charger favoris
  useEffect(() => {
    if (!id) return;
    try {
      const favs = JSON.parse(localStorage.getItem('favorites_v1') || '[]') as string[];
      setIsFavorite(favs.includes(id));
    } catch {
      setIsFavorite(false);
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
    const list = await fetchCandidates(movie);
    if (list.length === 1) {
      setSelectedReader(list[0]);
    } else {
      setSelectedReader(null);
    }
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
      setIsWatching(true);
      setVideoLoading(true);
      setSourcesOpen(false);
      toast.success('Lecture lancée');
      
      // Simuler chargement
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
        setCandidates(list);
        setSourcesOpen(true);
        return;
      }

      const chosen = list[0];
      handleChooseAndWatch(chosen);
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
      text: `Regarde ${movie.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Lien copié dans le presse-papiers');
      }
    } catch {
      toast.error('Impossible de partager');
    }
  }, [movie]);

  // Ajouter commentaire
  const addComment = useCallback(() => {
    if (!newUser.trim() || !newComment.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const nextId = comments.length ? comments[comments.length - 1].id + 1 : 1;
    setComments([
      ...comments,
      {
        id: nextId,
        user: newUser.trim(),
        lang: newLang,
        text: newComment.trim(),
        rating: newRating,
        isAdmin: false,
      },
    ]);

    setNewComment('');
    setNewUser('');
    setNewLang('Français');
    setNewRating(5);
    setLikes(likes + 1);
    toast.success('Commentaire ajouté !');
  }, [comments, newUser, newComment, newLang, newRating, likes]);

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
          <p className="text-muted-foreground">Film non trouvé</p>
          <Button onClick={() => navigate('/movies')} className="mt-4">
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
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => setIsWatching(false)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour aux détails
            </Button>
            <h1 className="text-2xl font-bold truncate">{movie.title}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lecteur */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-black rounded-lg overflow-hidden relative aspect-video">
                {videoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                    <span className="ml-2 text-white">Chargement du lecteur...</span>
                  </div>
                ) : (
                  <iframe
                    src={currentVideoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    scrolling="no"
                    frameBorder="0"
                    title={movie.title}
                  />
                )}
              </div>

              {/* Synopsis */}
              {movie.overview && (
                <Card>
                  <CardHeader>
                    <CardTitle>Synopsis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{movie.overview}</p>
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
                            <div className="w-full aspect-[2/3] bg-secondary/20 rounded-md mb-2" />
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
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
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
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <CardTitle>Avis des utilisateurs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {comments.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {comments.map(({ id, user, lang, text, rating, isAdmin }) => (
                        <div key={id} className="border-b pb-4 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">{user}</p>
                            {isAdmin && (
                              <Badge variant="default" className="text-xs">Admin</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">• {lang}</span>
                          </div>
                          <p className="text-sm mb-2">{text}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">
                      Aucun avis disponible.
                    </p>
                  )}

                  {/* Formulaire */}
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold">Ajouter un avis</h3>
                    <input
                      type="text"
                      placeholder="Votre nom"
                      value={newUser}
                      onChange={(e) => setNewUser(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    />
                    <select
                      value={newLang}
                      onChange={(e) => setNewLang(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option>Français</option>
                      <option>Anglais</option>
                      <option>Espagnol</option>
                      <option>Allemand</option>
                      <option>Italien</option>
                    </select>
                    <textarea
                      placeholder="Votre commentaire"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      rows={3}
                    />
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Note: {newRating}/5
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={newRating}
                        onChange={(e) => setNewRating(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <Button onClick={addComment} className="w-full">
                      Ajouter mon avis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
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
                      className="w-full rounded-md mb-3 object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-secondary/20 rounded-md mb-3" />
                  )}

                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Titre:</strong>
                      <p className="text-foreground">{movie.title}</p>
                    </div>
                    {movie.tagline && (
                      <p className="text-xs italic text-muted-foreground">"{movie.tagline}"</p>
                    )}
                    <div>
                      <strong>Durée:</strong>
                      <p>{formatDuration(movie.runtime)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span>
                        {movie.vote_average ? movie.vote_average.toFixed(1) : '—'} / 10
                      </span>
                      {movie.vote_count && (
                        <span className="text-xs text-muted-foreground">
                          ({movie.vote_count} votes)
                        </span>
                      )}
                    </div>
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
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ThumbsUp className="w-5 h-5 text-red-500" />
                    <span>{likes} likes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <span>{views} vues</span>
                  </div>
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
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
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

                  <p className="text-muted-foreground mb-6 max-w-2xl">{movie.overview}</p>

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
                      Sources
                    </Button>

                    {trailer && (
                      <Button size="lg" variant="outline" asChild>
                        <a
                          href={`https://www.youtube.com/watch?v=${trailer.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Bande-annonce
                        </a>
                      </Button>
                    )}

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

                    <Button size="lg" variant="ghost" onClick={toggleFavorite}>
                      <Bookmark className="w-5 h-5" />
                    </Button>

                    <Button size="lg" variant="ghost" onClick={handleShare}>
                      <Share2 className="w-5 h-5" />
                    </Button>
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
                            No Image
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

          {/* Modal Sources */}
          <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Choisir une source</DialogTitle>
                  <button
                    onClick={() => setSourcesOpen(false)}
                    className="hover:opacity-70"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {sourcesLoading ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Recherche des sources...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Aucune source trouvée.
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
                    {candidates.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 border rounded-md p-3 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{r.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.media_type} • {r.language}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedReader(r);
                              handleChooseAndWatch(r);
                            }}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Regarder
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const final = buildFinalUrl(r.url, r, movie);
                              if (final) window.open(final, '_blank', 'noopener');
                            }}
                          >
                            Ouvrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default MovieDetail