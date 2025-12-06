import { MediaCard } from './MediaCard';
import { TMDBMovie, TMDBTV, TMDBPerson } from '@/lib/tmdb';
import { motion } from 'framer-motion';
import { Film, Tv, User } from 'lucide-react';

interface MediaGridProps {
  items: (TMDBMovie | TMDBTV | TMDBPerson)[];
  mediaType?: 'movie' | 'tv' | 'person';
  emptyMessage?: string;
  showTitle?: boolean;
  title?: string;
  icon?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export const MediaGrid = ({ 
  items, 
  mediaType, 
  emptyMessage = 'Aucun élément trouvé.',
  showTitle = false,
  title,
  icon
}: MediaGridProps) => {
  if (!items || items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          {mediaType === 'movie' && <Film className="w-10 h-10 text-muted-foreground/50" />}
          {mediaType === 'tv' && <Tv className="w-10 h-10 text-muted-foreground/50" />}
          {mediaType === 'person' && <User className="w-10 h-10 text-muted-foreground/50" />}
          {!mediaType && <Film className="w-10 h-10 text-muted-foreground/50" />}
        </div>
        <p className="text-sm">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <div>
      {showTitle && title && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          {icon}
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          <span className="text-sm text-muted-foreground">{items.length} résultats</span>
        </motion.div>
      )}
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
      >
        {items.map((item, index) => {
          const type: 'movie' | 'tv' | 'person' =
            mediaType || (item as any).media_type || 'movie';

          const title =
            'title' in item
              ? item.title
              : 'name' in item
              ? item.name
              : 'Sans titre';

          const posterPath =
            'poster_path' in item
              ? item.poster_path
              : 'profile_path' in item
              ? item.profile_path
              : null;

          const releaseDate =
            'release_date' in item
              ? item.release_date
              : 'first_air_date' in item
              ? item.first_air_date
              : undefined;

          const voteAverage =
            'vote_average' in item ? item.vote_average : undefined;

          return (
            <motion.div key={`${type}-${item.id}`} variants={itemVariants}>
              <MediaCard
                id={item.id}
                title={title}
                posterPath={posterPath}
                voteAverage={voteAverage}
                releaseDate={releaseDate}
                mediaType={type}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
