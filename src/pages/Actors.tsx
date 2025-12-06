import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tmdbApi, TMDBPerson } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Users, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Actors = () => {
  const [people, setPeople] = useState<TMDBPerson[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPeople(1);
  }, []);

  const fetchPeople = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await tmdbApi.getPopularPeople(pageNum);
      
      if (pageNum === 1) {
        setPeople(data.results || []);
      } else {
        setPeople(prev => [...prev, ...(data.results || [])]);
      }
      setHasMore(pageNum < (data.total_pages || 1));
    } catch (error) {
      console.error('Failed to fetch people:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPeople(nextPage);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-background to-background" />
        <div className="relative container mx-auto px-4 text-center">
          <Users className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Acteurs & Célébrités</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Découvrez les stars du cinéma et de la télévision
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {loading && page === 1 ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {people.map((person) => (
                  <motion.div
                    key={person.id}
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link to={`/person/${person.id}`} className="group block">
                      <div className="relative aspect-square rounded-full overflow-hidden bg-secondary mx-auto w-32 h-32 md:w-40 md:h-40">
                        {person.profile_path ? (
                          <img
                            src={tmdbApi.getImageUrl(person.profile_path, 'w500')}
                            alt={person.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="mt-4 text-center">
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {person.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {person.known_for_department}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              
              {hasMore && (
                <div className="flex justify-center mt-12">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    size="lg"
                    variant="outline"
                  >
                    {loading ? 'Chargement...' : 'Charger plus'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Actors;
