import { useState, useEffect, useMemo, useCallback } from 'react';
import { tmdbApi, TMDBTV } from '@/lib/tmdb';
import { MediaGrid } from '@/components/MediaGrid';
import { Navbar } from '@/components/Navbar';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { 
  Play, Sparkles, TrendingUp, Star, Calendar, Filter, X, 
  SlidersHorizontal, ChevronDown, Search, Flame, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Genre {
  id: number;
  name: string;
}

const Anime = () => {
  const { t } = useI18n();
  const [anime, setAnime] = useState<TMDBTV[]>([]);
  const [category, setCategory] = useState('popular');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('popularity.desc');
  const [searchQuery, setSearchQuery] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const data = await tmdbApi.getTVGenres();
        setGenres(data.genres || []);
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };
    loadGenres();
  }, []);

  const fetchAnime = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        sort_by: sortBy,
        with_genres: selectedGenre !== 'all' ? `16,${selectedGenre}` : '16',
        with_origin_country: 'JP',
      };
      
      if (selectedYear !== 'all') {
        params.first_air_date_year = selectedYear;
      }
      if (minRating > 0) {
        params['vote_average.gte'] = minRating;
      }
      
      const data = await tmdbApi.discoverTV(params);
      
      setAnime(data.results || []);
      setTotalPages(Math.min(data.total_pages || 1, 500));
      setTotalResults(data.total_results || 0);
    } catch (error) {
      console.error('Failed to fetch anime:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, selectedYear, minRating, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [category, selectedGenre, selectedYear, minRating, sortBy]);

  useEffect(() => {
    fetchAnime(page);
  }, [page, fetchAnime]);

  const filteredAnime = useMemo(() => {
    if (!searchQuery.trim()) return anime;
    
    const query = searchQuery.toLowerCase();
    return anime.filter(a => 
      a.name?.toLowerCase().includes(query) ||
      a.original_name?.toLowerCase().includes(query)
    );
  }, [anime, searchQuery]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSelectedGenre('all');
    setSelectedYear('all');
    setMinRating(0);
    setSortBy('popularity.desc');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedGenre !== 'all' || selectedYear !== 'all' || minRating > 0 || searchQuery.trim();

  const categories = [
    { id: 'popular', label: t('movies.popular'), icon: Flame },
    { id: 'top_rated', label: t('movies.topRated'), icon: Star },
    { id: 'new', label: t('movies.upcoming'), icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-background" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-pink-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute inset-0 bg-noise opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <Sparkles className="w-8 h-8 text-pink-500 animate-pulse" />
            <Play className="w-12 h-12 text-primary" />
            <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-pink-500 via-primary to-purple-500 bg-clip-text text-transparent">
              {t('anime.title')}
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            {t('anime.description')}
          </motion.p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={category === cat.id ? 'default' : 'outline'}
                    onClick={() => {
                      setCategory(cat.id);
                      if (cat.id === 'top_rated') {
                        setSortBy('vote_average.desc');
                      } else if (cat.id === 'new') {
                        setSortBy('first_air_date.desc');
                      } else {
                        setSortBy('popularity.desc');
                      }
                    }}
                    className={`gap-2 rounded-full transition-all ${
                      category === cat.id 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20' 
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                  </Button>
                ))}
              </div>
              
              <Button
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 rounded-full ${showFilters ? 'bg-gradient-to-r from-pink-500 to-purple-500' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t('common.filters')}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-white/20">
                    {[selectedGenre !== 'all', selectedYear !== 'all', minRating > 0, searchQuery.trim()].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-6 space-y-6 border-pink-500/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Filter className="w-5 h-5 text-pink-500" />
                        Filtres avancés
                      </h3>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                          <X className="w-4 h-4 mr-1" />
                          {t('common.reset')}
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Search className="w-4 h-4 text-muted-foreground" />
                          {t('common.search')}
                        </label>
                        <Input
                          placeholder="Titre de l'anime..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="rounded-lg bg-secondary/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                          Genre additionnel
                        </label>
                        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                          <SelectTrigger className="rounded-lg bg-secondary/50">
                            <SelectValue placeholder="Animation uniquement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Animation uniquement</SelectItem>
                            {genres.filter(g => g.id !== 16).map((genre) => (
                              <SelectItem key={genre.id} value={String(genre.id)}>
                                + {genre.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {t('filter.year')}
                        </label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="rounded-lg bg-secondary/50">
                            <SelectValue placeholder={t('filter.allYears')} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">{t('filter.allYears')}</SelectItem>
                            {years.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Star className="w-4 h-4 text-muted-foreground" />
                          {t('filter.minRating')}: {minRating > 0 ? minRating.toFixed(1) : t('common.all')}
                        </label>
                        <Slider
                          value={[minRating]}
                          onValueChange={([val]) => setMinRating(val)}
                          min={0}
                          max={9}
                          step={0.5}
                          className="py-4"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          {t('filter.sortBy')}
                        </label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="rounded-lg bg-secondary/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="popularity.desc">{t('sort.popularityDesc')}</SelectItem>
                            <SelectItem value="popularity.asc">{t('sort.popularityAsc')}</SelectItem>
                            <SelectItem value="vote_average.desc">{t('sort.ratingDesc')}</SelectItem>
                            <SelectItem value="vote_average.asc">{t('sort.ratingAsc')}</SelectItem>
                            <SelectItem value="first_air_date.desc">{t('sort.dateDesc')}</SelectItem>
                            <SelectItem value="first_air_date.asc">{t('sort.dateAsc')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">{t('filter.active')}:</span>
                        {selectedGenre !== 'all' && (
                          <Badge variant="secondary" className="gap-1 bg-pink-500/10 text-pink-400">
                            + {genres.find(g => String(g.id) === selectedGenre)?.name}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGenre('all')} />
                          </Badge>
                        )}
                        {selectedYear !== 'all' && (
                          <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-400">
                            {selectedYear}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedYear('all')} />
                          </Badge>
                        )}
                        {minRating > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            Note ≥ {minRating}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setMinRating(0)} />
                          </Badge>
                        )}
                        {searchQuery.trim() && (
                          <Badge variant="secondary" className="gap-1">
                            "{searchQuery}"
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-4 text-sm text-muted-foreground">
            {totalResults.toLocaleString()} {t('anime.found')}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full"
              />
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              <MediaGrid items={filteredAnime} mediaType="tv" />
              
              {!searchQuery.trim() && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalResults}
                  itemsPerPage={20}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Anime;
