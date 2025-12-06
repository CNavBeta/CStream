import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Play, Star, Clock, CheckCircle, Pause, XCircle, LogOut, Shield, TrendingUp, Film, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
interface AnimeSource {
  id: string;
  name: string;
  url: string;
  type: string;
  language: string;
  is_active: boolean;
}
interface UserAnime {
  id: string;
  anime_id: number;
  status: string;
  progress: number;
  score: number | null;
  notes: string | null;
}
const statusConfig = {
  watching: {
    label: 'En cours',
    icon: Play,
    color: 'bg-blue-500'
  },
  completed: {
    label: 'Terminé',
    icon: CheckCircle,
    color: 'bg-green-500'
  },
  plan_to_watch: {
    label: 'À voir',
    icon: Clock,
    color: 'bg-yellow-500'
  },
  on_hold: {
    label: 'En pause',
    icon: Pause,
    color: 'bg-orange-500'
  },
  dropped: {
    label: 'Abandonné',
    icon: XCircle,
    color: 'bg-red-500'
  }
};
const Dashboard = () => {
  const {
    user,
    isAdmin,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [sources, setSources] = useState<AnimeSource[]>([]);
  const [userAnimes, setUserAnimes] = useState<UserAnime[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    setLoading(true);

    // Fetch anime sources
    const {
      data: sourcesData
    } = await supabase.from('readers').select('*').eq('enabled', true).limit(20);
    if (sourcesData) {
      setSources(sourcesData.map(s => ({
        id: s.id,
        name: s.label,
        url: s.url,
        type: s.media_type,
        language: s.language,
        is_active: s.enabled ?? true
      })));
    }

    // Fetch user anime list
    if (user) {
      const {
        data: animesData
      } = await supabase.from('watchlist').select('*').eq('user_id', user.id);
      if (animesData) {
        setUserAnimes(animesData.map(a => ({
          id: a.id,
          anime_id: a.tmdb_id,
          status: 'watching',
          progress: 0,
          score: null,
          notes: null
        })));
      }
    }
    setLoading(false);
  };
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const stats = {
    total: userAnimes.length,
    watching: userAnimes.filter(a => a.status === 'watching').length,
    completed: userAnimes.filter(a => a.status === 'completed').length,
    planToWatch: userAnimes.filter(a => a.status === 'plan_to_watch').length
  };
  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">CSLink</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                  <p className="text-2xl font-bold">{stats.watching}</p>
                </div>
                <Play className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">À voir</p>
                  <p className="text-2xl font-bold">{stats.planToWatch}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="sources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sources">
              <Film className="w-4 h-4 mr-2" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="mylist">
              <Tv className="w-4 h-4 mr-2" />
              Ma Liste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher une source..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? Array.from({
              length: 6
            }).map((_, i) => <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>) : filteredSources.length > 0 ? filteredSources.map(source => <Card key={source.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {source.name}
                        </CardTitle>
                        <Badge variant="secondary">{source.language}</Badge>
                      </div>
                      <CardDescription className="truncate">{source.url}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{source.type}</Badge>
                        <Button size="sm" className="ml-auto" onClick={() => window.open(source.url, '_blank')}>
                          <Play className="w-3 h-3 mr-1" />
                          Regarder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>) : <Card className="col-span-full">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Aucune source trouvée
                  </CardContent>
                </Card>}
            </div>
          </TabsContent>

          <TabsContent value="mylist" className="space-y-4">
            <div className="grid gap-4">
              {userAnimes.length > 0 ? userAnimes.map(anime => <Card key={anime.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Anime #{anime.anime_id}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={statusConfig[anime.status as keyof typeof statusConfig]?.color}>
                              {statusConfig[anime.status as keyof typeof statusConfig]?.label}
                            </Badge>
                            {anime.score && <span className="flex items-center text-sm text-muted-foreground">
                                <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                                {anime.score}/10
                              </span>}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Épisode {anime.progress}
                        </span>
                      </div>
                    </CardContent>
                  </Card>) : <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Votre liste est vide</p>
                    <p className="text-sm mt-1">Ajoutez des animes depuis les sources</p>
                  </CardContent>
                </Card>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default Dashboard;