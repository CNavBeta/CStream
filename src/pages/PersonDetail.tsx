import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tmdbApi } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { MediaGrid } from '@/components/MediaGrid';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const PersonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerson = async () => {
      if (!id) return;
      try {
        const data = await tmdbApi.getPersonDetails(parseInt(id));
        setPerson(data);
      } catch (error) {
        console.error('Failed to fetch person:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerson();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Personne non trouvée</p>
        </div>
      </div>
    );
  }

  const movies = person.combined_credits?.cast
    ?.filter((c: any) => c.media_type === 'movie' && c.poster_path)
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, 12) || [];

  const tvShows = person.combined_credits?.cast
    ?.filter((c: any) => c.media_type === 'tv' && c.poster_path)
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, 12) || [];

  const calculateAge = (birthday: string) => {
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Link to="/actors" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0"
            >
              {person.profile_path ? (
                <img
                  src={tmdbApi.getImageUrl(person.profile_path, 'w500')}
                  alt={person.name}
                  className="w-64 rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-64 aspect-[2/3] rounded-xl bg-secondary flex items-center justify-center">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {person.name?.charAt(0)}
                  </span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <h1 className="text-4xl font-bold mb-4">{person.name}</h1>
              
              <Badge variant="secondary" className="mb-4">
                {person.known_for_department}
              </Badge>

              <div className="flex flex-wrap items-center gap-4 mb-6 text-muted-foreground">
                {person.birthday && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(person.birthday).toLocaleDateString('fr-FR')}
                      {' '}({calculateAge(person.birthday)} ans)
                    </span>
                  </div>
                )}
                {person.place_of_birth && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{person.place_of_birth}</span>
                  </div>
                )}
              </div>

              {person.biography && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-2">Biographie</h2>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {person.biography || 'Aucune biographie disponible.'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Movies */}
      {movies.length > 0 && (
        <section className="py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Films</h2>
            <MediaGrid items={movies} mediaType="movie" />
          </div>
        </section>
      )}

      {/* TV Shows */}
      {tvShows.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Séries TV</h2>
            <MediaGrid items={tvShows} mediaType="tv" />
          </div>
        </section>
      )}
    </div>
  );
};

export default PersonDetail;
