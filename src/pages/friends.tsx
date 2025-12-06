import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, UserPlus, Check, X, UserMinus, Clock, Loader2 } from 'lucide-react';

const Friends = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    friends, 
    pendingRequests, 
    sentRequests, 
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (friendId: string) => {
    const { error } = await sendFriendRequest(friendId);
    if (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    } else {
      toast.success('Demande d\'ami envoyée !');
      setSearchResults(searchResults.filter(u => u.id !== friendId));
    }
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await acceptFriendRequest(friendshipId);
    if (error) {
      toast.error('Erreur lors de l\'acceptation');
    } else {
      toast.success('Ami ajouté !');
    }
  };

  const handleReject = async (friendshipId: string) => {
    const { error } = await rejectFriendRequest(friendshipId);
    if (error) {
      toast.error('Erreur lors du refus');
    } else {
      toast.success('Demande refusée');
    }
  };

  const handleRemove = async (friendshipId: string) => {
    const { error } = await removeFriend(friendshipId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Ami retiré');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <Users className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Communauté</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Amis
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Connectez-vous avec d'autres fans
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              Rechercher des utilisateurs
            </h2>
            
            <div className="flex gap-3">
              <Input
                placeholder="Rechercher par nom d'utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Rechercher
              </Button>
            </div>

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2"
                >
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback>{result.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{result.display_name || result.username}</p>
                          <p className="text-sm text-muted-foreground">@{result.username}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleSendRequest(result.id)} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-6"
            >
              <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-400" />
                Demandes en attente ({pendingRequests.length})
              </h2>
              
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.profile?.avatar_url || undefined} />
                        <AvatarFallback>{request.profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.profile?.display_name || request.profile?.username}</p>
                        <p className="text-sm text-muted-foreground">@{request.profile?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAccept(request.id)} className="gap-1">
                        <Check className="w-4 h-4" />
                        Accepter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReject(request.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Friends List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6"
          >
            <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-green-400" />
              Mes amis ({friends.length})
            </h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun ami pour le moment</p>
                <p className="text-sm text-muted-foreground/70">Recherchez des utilisateurs pour les ajouter</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {friends.map((friendship) => (
                  <div
                    key={friendship.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friendship.profile?.avatar_url || undefined} />
                        <AvatarFallback>{friendship.profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friendship.profile?.display_name || friendship.profile?.username}</p>
                        <p className="text-sm text-muted-foreground">@{friendship.profile?.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(friendship.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-6"
            >
              <h2 className="font-display text-2xl mb-4 text-muted-foreground">
                Demandes envoyées ({sentRequests.length})
              </h2>
              
              <div className="space-y-2">
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/20"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.profile?.avatar_url || undefined} />
                        <AvatarFallback>{request.profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.profile?.display_name || request.profile?.username}</p>
                        <p className="text-sm text-muted-foreground">En attente...</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleReject(request.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;