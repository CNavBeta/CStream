import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Film, Tv, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { tmdbApi, TMDBSearchResult } from '@/lib/tmdb';
import { motion, AnimatePresence } from 'framer-motion';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // 🔒 Fermer la liste si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔎 Recherche avec debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await tmdbApi.searchMulti(query);
        setResults(data.results?.slice(0, 8) || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // 🎬 Navigation selon type
  const handleSelect = useCallback((item: TMDBSearchResult) => {
    setIsOpen(false);
    setQuery('');
    if (item.media_type === 'movie') navigate(`/movie/${item.id}`);
    else if (item.media_type === 'tv') navigate(`/tv/${item.id}`);
    else if (item.media_type === 'person') navigate(`/person/${item.id}`);
  }, [navigate]);

  // 🎨 Icônes par type
  const getIcon = useCallback((type?: string) => {
    switch (type) {
      case 'movie': return <Film className="w-4 h-4 text-primary" />;
      case 'tv': return <Tv className="w-4 h-4 text-blue-500" />;
      case 'person': return <User className="w-4 h-4 text-green-500" />;
      default: return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      {/* Champ de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher films, séries, animes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 bg-secondary/40 border border-border/50 rounded-full focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted/30 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Résultats */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 w-full bg-card/90 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {results.map((item) => {
              const title = 'title' in item ? item.title : 'name' in item ? item.name : '';
              const image = 'poster_path' in item ? item.poster_path : 'profile_path' in item ? item.profile_path : null;
              const subtitle = item.media_type === 'movie'
                ? ('release_date' in item ? item.release_date?.split('-')[0] : '')
                : item.media_type === 'tv'
                ? ('first_air_date' in item ? item.first_air_date?.split('-')[0] : '')
                : ('known_for_department' in item ? item.known_for_department : '');

              return (
                <button
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                    {image ? (
                      <img
                        src={tmdbApi.getImageUrl(image, 'w200')}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getIcon(item.media_type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getIcon(item.media_type)}
                      <span className="capitalize">
                        {item.media_type === 'tv' ? 'Série' : item.media_type === 'movie' ? 'Film' : 'Personne'}
                      </span>
                      {subtitle && <span>• {subtitle}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loader */}
      {loading && (
        <div className="absolute top-full mt-2 w-full bg-card/90 backdrop-blur-md border border-border rounded-xl p-4 text-center shadow-lg">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      )}
    </div>
  );
};
