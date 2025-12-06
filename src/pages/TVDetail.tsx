import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tmdbApi } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { MediaGrid } from '@/components/MediaGrid';
import { TrailerModal } from '@/components/TrailerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Star, Calendar, Heart, Bookmark, Share2, ChevronLeft, Film } from 'lucide-react';
import { motion } from 'framer-motion';

const TVDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    const fetchShow = async () => {
      if (!id) return;
      try {
        const data = await tmdbApi.getTVDetails(parseInt(id));
        setShow(data);
        if (data.seasons?.length > 0) {
          const firstSeason = data.seasons.find((s: any) => s.season_number > 0) || data.seasons[0];
          const seasonData = await tmdbApi.getTVSeasonDetails(parseInt(id), firstSeason.season_number);
          setSelectedSeason(seasonData);
        }
      } catch (error) {
        console.error('Failed to fetch show:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [id]);

  const handleSeasonChange = async (seasonNumber: number) => {
    if (!id) return;
    try {
      const seasonData = await tmdbApi.getTVSeasonDetails(parseInt(id), seasonNumber);
      setSelectedSeason(seasonData);
    } catch (error) {
      console.error('Failed to fetch season:', error);
    }
  };

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

  if (!show) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Série non trouvée</p>
        </div>
      </div>
    );
  }

  const cast = show.credits?.cast?.slice(0, 12) || [];
  const trailer = show.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[60vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${tmdbApi.getImageUrl(show.backdrop_path, 'original')})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <Link to="/tv" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0"
            >
              <img
                src={tmdbApi.getImageUrl(show.poster_path, 'w500')}
                alt={show.name}
                className="w-64 rounded-xl shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{show.name}</h1>
              
              {show.tagline && (
                <p className="text-xl text-muted-foreground italic mb-4">{show.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mb-6">
                {show.vote_average > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-semibold">{show.vote_average.toFixed(1)}</span>
                  </div>
                )}
                {show.first_air_date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(show.first_air_date).getFullYear()}</span>
                  </div>
                )}
                <Badge variant="outline">{show.number_of_seasons} saisons</Badge>
                <Badge variant="outline">{show.number_of_episodes} épisodes</Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {show.genres?.map((genre: any) => (
                  <Badge key={genre.id} variant="secondary">{genre.name}</Badge>
                ))}
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl">{show.overview}</p>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Regarder
                </Button>
                {trailer && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => setTrailerOpen(true)}
                    className="gap-2"
                  >
                    <Film className="w-5 h-5" />
                    Bande-annonce
                  </Button>
                )}
                <Button size="lg" variant="ghost">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="ghost">
                  <Bookmark className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Seasons & Episodes */}
      {show.seasons?.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Saisons & Épisodes</h2>
            
            <Tabs defaultValue={String(show.seasons.find((s: any) => s.season_number > 0)?.season_number || 1)}>
              <TabsList className="mb-6 flex-wrap">
                {show.seasons
                  .filter((s: any) => s.season_number > 0)
                  .map((season: any) => (
                    <TabsTrigger
                      key={season.id}
                      value={String(season.season_number)}
                      onClick={() => handleSeasonChange(season.season_number)}
                    >
                      Saison {season.season_number}
                    </TabsTrigger>
                  ))}
              </TabsList>

              {selectedSeason && (
                <div className="space-y-4">
                  {selectedSeason.episodes?.map((episode: any) => (
                    <div
                      key={episode.id}
                      className="flex gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-secondary">
                        {episode.still_path ? (
                          <img
                            src={tmdbApi.getImageUrl(episode.still_path, 'w300')}
                            alt={episode.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-primary">E{episode.episode_number}</span>
                          <h3 className="font-medium truncate">{episode.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{episode.overview}</p>
                        {episode.air_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(episode.air_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon">
                        <Play className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Tabs>
          </div>
        </section>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <section className="py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Distribution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {cast.map((person: any) => (
                <Link key={person.id} to={`/person/${person.id}`} className="group">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                    {person.profile_path ? (
                      <img
                        src={tmdbApi.getImageUrl(person.profile_path, 'w300')}
                        alt={person.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.character}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {show.recommendations?.results?.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Recommandations</h2>
            <MediaGrid items={show.recommendations.results.slice(0, 12)} mediaType="tv" />
          </div>
        </section>
      )}

      {/* Trailer Modal */}
      <TrailerModal
        open={trailerOpen}
        onOpenChange={setTrailerOpen}
        trailerKey={trailer?.key || null}
        title={`${show.name} - Bande-annonce`}
      />
    </div>
  );
};

export default TVDetail;
