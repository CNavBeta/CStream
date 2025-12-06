import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { tmdbApi, TMDBMovie, TMDBTV } from "@/lib/tmdb";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { MediaGrid } from "@/components/MediaGrid";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  Film,
  Tv,
  Sparkles,
  Zap,
  Clock,
  Heart,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";

const Home = () => {
  const [trending, setTrending] = useState<(TMDBMovie | TMDBTV)[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMovie[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBTV[]>([]);
  const [anime, setAnime] = useState<TMDBTV[]>([]);
  const [marqueeImages, setMarqueeImages] = useState<string[]>([]);
  const [featuredItem, setFeaturedItem] = useState<TMDBMovie | TMDBTV | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"all" | "movies" | "tv">(
    "all",
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingRes, moviesRes, tvRes, animeRes] = await Promise.all([
          tmdbApi.getTrending("all", "week"),
          tmdbApi.getPopularMovies(),
          tmdbApi.getPopularTV(),
          tmdbApi.getAnime(),
        ]);

        const trendingItems = trendingRes.results || [];
        setTrending(trendingItems.slice(0, 12));
        setPopularMovies(moviesRes.results || []);
        setPopularTV(tvRes.results || []);
        setAnime(animeRes.results || []);

        const featured = trendingItems.find((item: any) => item.backdrop_path);
        setFeaturedItem(featured || trendingItems[0]);

        const images = trendingItems
          .filter((item: any) => item.poster_path)
          .slice(0, 24)
          .map((item: any) => tmdbApi.getImageUrl(item.poster_path, "w500"));
        setMarqueeImages(images);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground"
          >
            Chargement des contenus...
          </motion.p>
        </div>
      </div>
    );
  }

  const featuredTitle =
    featuredItem &&
    ("title" in featuredItem
      ? featuredItem.title
      : (featuredItem as TMDBTV).name);
  const featuredOverview = featuredItem?.overview;
  const featuredMediaType =
    featuredItem && ("title" in featuredItem ? "movie" : "tv");
  const featuredLink = featuredItem
    ? `/${featuredMediaType}/${featuredItem.id}`
    : "/";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {featuredItem && (
        <section className="relative h-[85vh] overflow-hidden">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${tmdbApi.getImageUrl(featuredItem.backdrop_path, "original")})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-noise opacity-30" />

          <div className="relative container mx-auto px-4 h-full flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-2xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 mb-4"
              >
                <span className="px-3 py-1 bg-gradient-to-r from-primary to-accent rounded-full text-white text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Tendance #1
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                  {"title" in featuredItem ? "Film" : "Série"}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
              >
                <span className="gradient-text glow-text">{featuredTitle}</span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-6 mb-6"
              >
                {featuredItem.vote_average > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full backdrop-blur-sm">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-bold text-yellow-400">
                      {featuredItem.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>2h 15min</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>98% Match</span>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-muted-foreground mb-8 line-clamp-3 max-w-xl"
              >
                {featuredOverview}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex gap-4"
              >
                <Link to={featuredLink}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full px-8 shadow-xl glow gap-2 text-lg"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Regarder
                  </Button>
                </Link>
                <Link to={featuredLink}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 border-white/20 hover:bg-white/10 backdrop-blur-sm gap-2"
                  >
                    Plus d'infos
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"
          />
        </section>
      )}

      <section className="py-16 -mt-20 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-between gap-4 mb-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Tendances</h2>
                <p className="text-muted-foreground">
                  Les plus regardés cette semaine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-full backdrop-blur-sm">
              {[
                { key: "all", label: "Tout" },
                { key: "movies", label: "Films" },
                { key: "tv", label: "Séries" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key as any)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.key
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <Link to="/trending">
              <Button
                variant="ghost"
                className="gap-2 rounded-full hover:bg-primary/10"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <MediaGrid
            items={
              activeCategory === "all"
                ? trending
                : activeCategory === "movies"
                  ? trending.filter((i) => "title" in i)
                  : trending.filter((i) => "name" in i && !("title" in i))
            }
          />
        </div>
      </section>

      {marqueeImages.length > 0 && (
        <section className="py-20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="container mx-auto px-4 mb-12 text-center relative z-10"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                Notre catalogue
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Explorez des <span className="gradient-text">milliers</span> de
              contenus
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Films, séries et animes du monde entier vous attendent
            </p>
          </motion.div>
          <ThreeDMarquee images={marqueeImages} />
        </section>
      )}

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Films Populaires</h2>
                <p className="text-muted-foreground">
                  Les blockbusters du moment
                </p>
              </div>
            </div>
            <Link to="/movies">
              <Button
                variant="ghost"
                className="gap-2 rounded-full hover:bg-primary/10"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
          <MediaGrid items={popularMovies.slice(0, 12)} mediaType="movie" />
        </div>
      </section>

      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Séries Populaires</h2>
                <p className="text-muted-foreground">
                  Les séries incontournables
                </p>
              </div>
            </div>
            <Link to="/tv">
              <Button
                variant="ghost"
                className="gap-2 rounded-full hover:bg-primary/10"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
          <MediaGrid items={popularTV.slice(0, 12)} mediaType="tv" />
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Anime</h2>
                <p className="text-muted-foreground">
                  Le meilleur de l'animation japonaise
                </p>
              </div>
            </div>
            <Link to="/anime">
              <Button
                variant="ghost"
                className="gap-2 rounded-full hover:bg-primary/10"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
          <MediaGrid items={anime.slice(0, 12)} mediaType="tv" />
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Zap,
                title: "Streaming HD",
                desc: "Qualité jusqu'à 4K HDR",
                color: "from-yellow-500 to-orange-500",
              },
              {
                icon: Clock,
                title: "Nouveautés",
                desc: "Contenus mis à jour quotidiennement",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Heart,
                title: "Favoris",
                desc: "Sauvegardez vos préférés",
                color: "from-pink-500 to-red-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 hover-lift cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <footer className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white fill-current" />
              </div>
              <span className="text-2xl font-bold gradient-text">CStream</span>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                href="https://discord.gg/HAKFFbdZ"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-5 rounded-2xl glass-card hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg group-hover:shadow-indigo-500/50 transition-all">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 512"
                      className="w-7 h-7 fill-current text-white"
                    >
                      <path d="M524.5 69.8a485.1 485.1 0 0 0-120.4-37.1c-1-.2-2 .3-2.5 1.2a337.5 337.5 0 0 0-14.9 30.6 447.8 447.8 0 0 0-134.4 0 309.5 309.5 0 0 0-15.1-30.6c-.5-.9-1.5-1.4-2.5-1.2A483.7 483.7 0 0 0 112 69.9c-.3.1-.6.3-.8.6C39.1 183.7 18.2 294.7 28.4 404.4c.1.5.4 1 .8 1.3A487.7 487.7 0 0 0 176 479.9c.8.2 1.6-.1 2.1-.7a348.2 348.2 0 0 0 29.9-49.5c.5-.9.1-2-.9-2.4a321.2 321.2 0 0 1-45.9-21.9 1.9 1.9 0 0 1-.2-3.1 251 251 0 0 0 9.1-7.1c.6-.5 1.4-.7 2.1-.3 96.2 43.9 200.4 43.9 295.5 0 .7-.3 1.5-.2 2.1.3 3 2.4 6 4.8 9.1 7.2.8.6 1 1.7.2 2.5a301.4 301.4 0 0 1-45.9 21.8c-1 .4-1.4 1.5-.9 2.5a391.1 391.1 0 0 0 30 48.8c.5.8 1.3 1.1 2.1.7a486 486 0 0 0 147.6-74.2c.4-.3.7-.8.8-1.3 12.3-126.8-20.5-236.9-86.9-334.5ZM222.5 337.6c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.4 59.2-52.8 59.2Zm195.4 0c-28.9 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.2 59.2-52.8 59.2Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold group-hover:text-indigo-400 transition-colors">
                      Rejoindre Discord
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Notre communauté vous attend
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.a>

              <Link to="/contact">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group relative p-5 rounded-2xl glass-card hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg group-hover:shadow-primary/50 transition-all">
                      <Heart className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold group-hover:text-primary transition-colors">
                        Nous contacter
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Questions, suggestions, contributions
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              </Link>
            </div>

            <div className="text-center text-muted-foreground text-sm space-y-2">
              <p>© 2024 CStream. Tous droits réservés.</p>
              <p>Données fournies par CDZ (Chems) Yacoub Mohamed</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
