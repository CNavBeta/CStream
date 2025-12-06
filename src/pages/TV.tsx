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
  Tv, TrendingUp, Star, Calendar, Clock, Filter, X, 
  SlidersHorizontal, ChevronDown, Sparkles, Search, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Genre {
  id: number;
  name: string;
}

const TVPage = () => {
  const { t } = useI18n();
  const [shows, setShows] = useState<TMDBTV[]>([]);
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

  const fetchShows = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      let data;
      
      if (selectedGenre !== 'all' || selectedYear !== 'all' || minRating > 0) {
        const params: Record<string, string | number> = {
          page: pageNum,
          sort_by: sortBy,
        };
        
        if (selectedGenre !== 'all') {
          params.with_genres = selectedGenre;
        }
        if (selectedYear !== 'all') {
          params.first_air_date_year = selectedYear;
        }
        if (minRating > 0) {
          params['vote_average.gte'] = minRating;
        }
        
        data = await tmdbApi.discoverTV(params);
      } else {
        switch (category) {
          case 'top_rated':
            data = await tmdbApi.getTopRatedTV(pageNum);
            break;
          case 'airing_today':
            data = await tmdbApi.getAiringTodayTV(pageNum);
            break;
          case 'on_the_air':
            data = await tmdbApi.getOnTheAirTV(pageNum);
            break;
          default:
            data = await tmdbApi.getPopularTV(pageNum);
        }
      }
      
      setShows(data.results || []);
      setTotalPages(Math.min(data.total_pages || 1, 500));
      setTotalResults(data.total_results || 0);
    } catch (error) {
      console.error('Failed to fetch TV shows:', error);
    } finally {
      setLoading(false);
    }
  }, [category, selectedGenre, selectedYear, minRating, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [category, selectedGenre, selectedYear, minRating, sortBy]);

  useEffect(() => {
    fetchShows(page);
  }, [page, fetchShows]);

  const filteredShows = useMemo(() => {
    if (!searchQuery.trim()) return shows;
    
    const query = searchQuery.toLowerCase();
    return shows.filter(s => 
      s.name?.toLowerCase().includes(query) ||
      s.original_name?.toLowerCase().includes(query)
    );
  }, [shows, searchQuery]);

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
    { id: 'popular', label: t('tv.popular'), icon: TrendingUp },
    { id: 'top_rated', label: t('tv.topRated'), icon: Star },
    { id: 'airing_today', label: t('tv.airingToday'), icon: Play },
    { id: 'on_the_air', label: t('tv.onTheAir'), icon: Tv },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-background to-background" />
        <div className="absolute inset-0 bg-noise opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <Tv className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-blue-400">Catalogue Séries</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t('tv.title')}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            {t('tv.description')}
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
                    onClick={() => setCategory(cat.id)}
                    className={`gap-2 rounded-full transition-all ${
                      category === cat.id 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
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
                className={`gap-2 rounded-full ${showFilters ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : ''}`}
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
                  <div className="glass-card p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Filter className="w-5 h-5 text-blue-500" />
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
                          placeholder="Titre de la série..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="rounded-lg bg-secondary/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                          {t('filter.genre')}
                        </label>
                        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                          <SelectTrigger className="rounded-lg bg-secondary/50">
                            <SelectValue placeholder={t('filter.allGenres')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('filter.allGenres')}</SelectItem>
                            {genres.map((genre) => (
                              <SelectItem key={genre.id} value={String(genre.id)}>
                                {genre.name}
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
                          <Badge variant="secondary" className="gap-1">
                            {genres.find(g => String(g.id) === selectedGenre)?.name}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGenre('all')} />
                          </Badge>
                        )}
                        {selectedYear !== 'all' && (
                          <Badge variant="secondary" className="gap-1">
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
            {totalResults.toLocaleString()} {t('tv.found')}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
              />
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : (
            <>
              <MediaGrid items={filteredShows} mediaType="tv" />
              
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

export default TVPage;
