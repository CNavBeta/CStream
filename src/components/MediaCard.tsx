import { Link } from 'react-router-dom';
import { Star, Play, ImageOff, Heart, Bookmark, Film, Tv, Calendar } from 'lucide-react';
import { tmdbApi } from '@/lib/tmdb';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage?: number;
  releaseDate?: string;
  mediaType: 'movie' | 'tv' | 'person';
}

export const MediaCard = ({
  id,
  title,
  posterPath,
  voteAverage,
  releaseDate,
  mediaType,
}: MediaCardProps) => {
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const linkPath = mediaType === 'person' ? `/person/${id}` : `/${mediaType}/${id}`;
  const year = releaseDate?.split('-')[0] ?? '—';

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'from-green-500 to-emerald-400';
    if (rating >= 6) return 'from-yellow-500 to-amber-400';
    return 'from-red-500 to-orange-400';
  };

  useEffect(() => {
    if (!user || mediaType === 'person') return;

    const checkStatus = async () => {
      try {
        const [favResult, watchlistResult] = await Promise.all([
          supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('media_id', String(id))
            .eq('media_type', mediaType)
            .maybeSingle(),
          supabase
            .from('watchlist')
            .select('id')
            .eq('user_id', user.id)
            .eq('tmdb_id', id)
            .eq('media_type', mediaType)
            .maybeSingle(),
        ]);

        if (favResult.error) {
          console.error('Error checking favorites:', favResult.error);
        } else {
          setIsFavorite(!!favResult.data);
        }

        if (watchlistResult.error) {
          console.error('Error checking watchlist:', watchlistResult.error);
        } else {
          setIsInWatchlist(!!watchlistResult.data);
        }
      } catch (error) {
        console.error('Error checking media status:', error);
      }
    };

    checkStatus();
  }, [user, id, mediaType]);

  const toggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      if (previousState) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', String(id))
          .eq('media_type', mediaType);
        
        if (error) {
          setIsFavorite(previousState);
          console.error('Supabase error:', error);
          toast.error('Erreur lors de la suppression');
          return;
        }
        toast.success('Retiré des favoris');
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          media_id: String(id),
          media_type: mediaType,
        });
        
        if (error) {
          setIsFavorite(previousState);
          console.error('Supabase error:', error);
          toast.error('Erreur lors de l\'ajout aux favoris');
          return;
        }
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      setIsFavorite(previousState);
      console.error('Error toggling favorite:', error);
      toast.error('Erreur lors de la modification');
    }
  }, [user, id, mediaType, isFavorite]);

  const toggleWatchlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Connectez-vous pour ajouter à la liste');
      return;
    }

    const previousState = isInWatchlist;
    setIsInWatchlist(!isInWatchlist);

    try {
      if (previousState) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('tmdb_id', id)
          .eq('media_type', mediaType);
        
        if (error) {
          setIsInWatchlist(previousState);
          console.error('Supabase error:', error);
          toast.error('Erreur lors de la suppression');
          return;
        }
        toast.success('Retiré de la liste');
      } else {
        const { error } = await supabase.from('watchlist').insert({
          user_id: user.id,
          tmdb_id: id,
          media_type: mediaType,
        });
        
        if (error) {
          setIsInWatchlist(previousState);
          console.error('Supabase error:', error);
          toast.error('Erreur lors de l\'ajout à la liste');
          return;
        }
        toast.success('Ajouté à la liste');
      }
    } catch (error) {
      setIsInWatchlist(previousState);
      console.error('Error toggling watchlist:', error);
      toast.error('Erreur lors de la modification');
    }
  }, [user, id, mediaType, isInWatchlist]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group"
    >
      <Link
        to={linkPath}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
        aria-label={`Voir ${mediaType === 'person' ? 'la personne' : 'le média'} : ${title}`}
      >
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-secondary to-secondary/50 shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500">
          {posterPath && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 shimmer bg-secondary" />
              )}
              <img
                src={tmdbApi.getImageUrl(posterPath, 'w500')}
                alt={title}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-muted">
              <ImageOff className="w-12 h-12 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground/50">Image non disponible</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: isHovered ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-xl"
              >
                <Play className="w-7 h-7 text-white fill-current ml-1" />
              </motion.div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4">
              <h4 className="font-bold text-white text-sm line-clamp-2 mb-1">{title}</h4>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                {mediaType === 'movie' && <Film className="w-3 h-3" />}
                {mediaType === 'tv' && <Tv className="w-3 h-3" />}
                <span>{year}</span>
              </div>
            </div>

            {mediaType !== 'person' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : -10 }}
                className="absolute top-3 left-3 flex gap-2"
              >
                <button 
                  className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
                    isFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-black/50 text-white hover:bg-red-500'
                  }`}
                  onClick={toggleFavorite}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button 
                  className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
                    isInWatchlist 
                      ? 'bg-primary text-white' 
                      : 'bg-black/50 text-white hover:bg-primary'
                  }`}
                  onClick={toggleWatchlist}
                >
                  <Bookmark className={`w-4 h-4 ${isInWatchlist ? 'fill-current' : ''}`} />
                </button>
              </motion.div>
            )}
          </div>

          {voteAverage && voteAverage > 0 && (
            <div className={`absolute top-2 right-2 px-2.5 py-1 bg-gradient-to-r ${getRatingColor(voteAverage)} rounded-full flex items-center gap-1.5 shadow-lg`}>
              <Star className="w-3 h-3 text-white fill-current" />
              <span className="text-xs font-bold text-white">
                {voteAverage.toFixed(1)}
              </span>
            </div>
          )}

          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-primary/50 transition-all duration-300" />
        </div>

        <div className="mt-3 px-1">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {year}
            </span>
            {mediaType !== 'person' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                {mediaType === 'movie' ? (
                  <><Film className="w-3 h-3" /> Film</>
                ) : (
                  <><Tv className="w-3 h-3" /> Série</>
                )}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
