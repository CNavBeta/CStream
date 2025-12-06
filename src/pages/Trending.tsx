import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tmdbApi, TMDBMovie, TMDBTV } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { MediaGrid } from '@/components/MediaGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, Film, Tv, Sparkles, Clock, Calendar,
  ArrowUp, Flame, Star, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TimeWindow = 'day' | 'week';
type MediaFilter = 'all' | 'movie' | 'tv';

const Trending = () => {
  const [trending, setTrending] = useState<(TMDBMovie | TMDBTV)[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>([]);
  const [trendingTV, setTrendingTV] = useState<TMDBTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('week');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const [allRes, moviesRes, tvRes] = await Promise.all([
          tmdbApi.getTrending('all', timeWindow),
          tmdbApi.getTrending('movie', timeWindow),
          tmdbApi.getTrending('tv', timeWindow),
        ]);

        setTrending(allRes.results || []);
        setTrendingMovies(moviesRes.results || []);
        setTrendingTV(tvRes.results || []);
        setTotalPages(Math.min(allRes.total_pages || 1, 20));
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [timeWindow, page]);

  const getDisplayItems = () => {
    switch (mediaFilter) {
      case 'movie':
        return trendingMovies;
      case 'tv':
        return trendingTV;
      default:
        return trending;
    }
  };

  const featuredItem = trending[0];
  const featuredTitle = featuredItem && ('title' in featuredItem ? featuredItem.title : (featuredItem as TMDBTV).name);
  const featuredMediaType = featuredItem && ('title' in featuredItem ? 'movie' : 'tv');

  if (loading && trending.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des tendances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {featuredItem && (
        <section className="relative h-[60vh] overflow-hidden">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${tmdbApi.getImageUrl(featuredItem.backdrop_path, 'original')})`,
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          <div className="relative container mx-auto px-4 h-full flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 border-0 gap-1 px-3 py-1">
                  <Flame className="w-4 h-4" />
                  Tendance #1 {timeWindow === 'day' ? "aujourd'hui" : 'cette semaine'}
                </Badge>
                <Badge variant="outline" className="backdrop-blur-sm">
                  {'title' in featuredItem ? 'Film' : 'Série'}
                </Badge>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="gradient-text">{featuredTitle}</span>
              </h1>

              <div className="flex items-center gap-4 mb-4">
                {featuredItem.vote_average > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-bold text-yellow-400">{featuredItem.vote_average.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {'release_date' in featuredItem 
                      ? featuredItem.release_date?.slice(0, 4)
                      : (featuredItem as TMDBTV).first_air_date?.slice(0, 4)}
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground line-clamp-3 mb-6 max-w-xl">
                {featuredItem.overview}
              </p>

              <Link to={`/${featuredMediaType}/${featuredItem.id}`}>
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Découvrir
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Tendances</h2>
              <p className="text-muted-foreground">
                Les contenus les plus populaires {timeWindow === 'day' ? "du jour" : "de la semaine"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-lg">
              <button
                onClick={() => setTimeWindow('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeWindow === 'day'
                    ? 'bg-primary text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Aujourd'hui
              </button>
              <button
                onClick={() => setTimeWindow('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeWindow === 'week'
                    ? 'bg-primary text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Cette semaine
              </button>
            </div>

            <Select value={mediaFilter} onValueChange={(v) => setMediaFilter(v as MediaFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Tout
                  </span>
                </SelectItem>
                <SelectItem value="movie">
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Films
                  </span>
                </SelectItem>
                <SelectItem value="tv">
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    Séries
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Contenus tendance', value: trending.length, icon: TrendingUp, color: 'from-orange-500 to-red-500' },
            { label: 'Films populaires', value: trendingMovies.length, icon: Film, color: 'from-blue-500 to-purple-500' },
            { label: 'Séries populaires', value: trendingTV.length, icon: Tv, color: 'from-green-500 to-teal-500' },
            { label: 'Période', value: timeWindow === 'day' ? 'Jour' : 'Semaine', icon: Clock, color: 'from-pink-500 to-rose-500' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-secondary/30 border border-border/50"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <MediaGrid 
              items={getDisplayItems()} 
              mediaType={mediaFilter === 'all' ? undefined : mediaFilter}
            />

            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
              <span className="text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Trending;
