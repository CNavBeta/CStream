import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UserPlus, Check, X, Users, LogIn, Search, Copy, Share2, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  friend_code: string;
}

const AddFriend = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [targetProfile, setTargetProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'not_found' | 'self' | 'already_friends' | 'pending' | 'ready' | 'search'>('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileData[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (codeFromUrl && !profileId) {
        await searchByIdOrCode(codeFromUrl);
        return;
      }

      if (!profileId) {
        setStatus('search');
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, friend_code')
          .eq('id', profileId)
          .single();

        if (error || !profile) {
          setStatus('not_found');
          setLoading(false);
          return;
        }

        setTargetProfile(profile);
        await checkExistingRelationship(profile.id);
      } catch (error) {
        console.error('Error checking friend status:', error);
        setStatus('not_found');
      }
      setLoading(false);
    };

    if (!authLoading) {
      checkStatus();
    }
  }, [profileId, user, authLoading, codeFromUrl]);

  const checkExistingRelationship = async (targetId: string) => {
    if (!user) {
      setStatus('ready');
      return;
    }

    if (targetId === user.id) {
      setStatus('self');
      return;
    }

    try {
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existingFriendship) {
        setStatus('already_friends');
        return;
      }

      const { data: pendingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (pendingRequest) {
        setStatus('pending');
        return;
      }

      setStatus('ready');
    } catch (error) {
      console.error('Error checking relationship:', error);
      setStatus('ready');
    }
  };

  const searchByIdOrCode = async (query: string) => {
    setSearching(true);
    try {
      let profile = null;

      const { data: byId } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .eq('id', query)
        .maybeSingle();

      if (byId) {
        profile = byId;
      } else {
        const { data: byCode } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, friend_code')
          .eq('friend_code', query)
          .maybeSingle();
        profile = byCode;
      }

      if (!profile) {
        toast.error('Utilisateur introuvable');
        setStatus('search');
        return;
      }

      setTargetProfile(profile);
      await checkExistingRelationship(profile.id);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Erreur lors de la recherche');
      setStatus('search');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, searchUsers]);

  const selectUser = async (profile: ProfileData) => {
    setTargetProfile(profile);
    await checkExistingRelationship(profile.id);
  };

  const ensureUserInUsersTable = async (
    userId: string,
    profile: { username: string; avatar_url: string | null; friend_code: string },
    email?: string
  ): Promise<boolean> => {
    try {
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.log('Users table not accessible');
      }

      if (!existingUser) {
        const userEmail = email || `${userId.slice(0, 8)}@placeholder.local`;
        
        const { error } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            username: profile.username,
            avatar_url: profile.avatar_url,
            user_code: profile.friend_code,
            is_admin: false,
            is_online: false,
          }, { onConflict: 'id' });

        if (error) {
          if (error.message?.includes('row-level security') || error.code === '42501') {
            console.log('RLS policy blocking');
            return true;
          }
          console.error('Error ensuring user exists:', error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error in ensureUserInUsersTable:', error);
      return false;
    }
  };

  const ensureProfileExists = async () => {
    if (!user) return false;
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, friend_code')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      await ensureUserInUsersTable(user.id, {
        username: existingProfile.username || '',
        avatar_url: existingProfile.avatar_url,
        friend_code: existingProfile.friend_code || '',
      }, user.email || undefined);
      return true;
    }
    
    const friendCode = String(Math.floor(10000 + Math.random() * 90000));
    const username = user.email?.split('@')[0] || `user_${friendCode}`;
    
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username: username,
      friend_code: friendCode,
    });
    
    if (!error) {
      await ensureUserInUsersTable(user.id, {
        username: username,
        avatar_url: null,
        friend_code: friendCode,
      }, user.email || undefined);
    }
    
    return !error;
  };

  const sendFriendRequest = async () => {
    if (!user || !targetProfile) return;

    setProcessing(true);
    try {
      const profileExists = await ensureProfileExists();
      if (!profileExists) {
        toast.error('Impossible de créer votre profil. Veuillez vous reconnecter.');
        return;
      }

      await ensureUserInUsersTable(targetProfile.id, {
        username: targetProfile.username || '',
        avatar_url: targetProfile.avatar_url,
        friend_code: targetProfile.friend_code || '',
      });

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: targetProfile.id,
        receiver_code: targetProfile.friend_code,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('Une demande a déjà été envoyée !');
          setStatus('pending');
        } else if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
          await ensureUserInUsersTable(user.id, {
            username: user.email?.split('@')[0] || 'user',
            avatar_url: null,
            friend_code: targetProfile.friend_code,
          }, user.email || undefined);
          
          await ensureUserInUsersTable(targetProfile.id, {
            username: targetProfile.username || '',
            avatar_url: targetProfile.avatar_url,
            friend_code: targetProfile.friend_code || '',
          });
          
          const { error: retryError } = await supabase.from('friend_requests').insert({
            sender_id: user.id,
            receiver_id: targetProfile.id,
            receiver_code: targetProfile.friend_code,
            status: 'pending',
          });
          
          if (!retryError) {
            toast.success(`Demande envoyée à ${targetProfile.username} !`);
            setStatus('pending');
            setTimeout(() => navigate('/chat'), 1500);
            return;
          } else if (retryError.code === '23505') {
            toast.info('Une demande a déjà été envoyée !');
            setStatus('pending');
            return;
          }
          toast.error('Erreur de synchronisation. Veuillez vous déconnecter et reconnecter.');
        } else {
          throw error;
        }
      } else {
        toast.success(`Demande envoyée à ${targetProfile.username} !`);
        setStatus('pending');
        setTimeout(() => navigate('/chat'), 1500);
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setProcessing(false);
    }
  };

  const copyShareLink = async () => {
    if (!user) return;
    
    try {
      const shareUrl = `${window.location.origin}/add-friend/${user.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien de partage copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Impossible de copier le lien');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden shadow-xl border-0">
            <div className="h-20 bg-gradient-to-r from-primary via-accent to-primary" />
            
            <CardContent className="relative pt-0 pb-8">
              {status === 'search' ? (
                <div className="pt-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Ajouter un ami</h2>
                    <p className="text-muted-foreground text-sm">
                      Recherchez un utilisateur par son nom
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom d'utilisateur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                      )}
                    </div>

                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <ScrollArea className="h-64 rounded-lg border">
                            <div className="p-2 space-y-1">
                              {searchResults.map((profile) => (
                                <button
                                  key={profile.id}
                                  onClick={() => selectUser(profile)}
                                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                                >
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={profile.avatar_url || ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                                      {profile.username?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-medium">{profile.username}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <AtSign className="w-3 h-3" />
                                      {profile.id.slice(0, 8)}...
                                    </p>
                                  </div>
                                  <UserPlus className="w-4 h-4 text-primary" />
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucun utilisateur trouvé</p>
                      </div>
                    )}

                    {user && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-3 text-center">
                          Ou partagez votre lien d'invitation
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={copyShareLink}
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Lien copié !
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              Copier mon lien d'invitation
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => navigate('/chat')}
                    >
                      Retour au chat
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center -mt-10">
                  <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
                    <AvatarImage src={targetProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
                      {targetProfile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-xl font-bold mt-3">
                    {targetProfile?.username || 'Utilisateur'}
                  </h2>

                  <div className="w-full mt-6">
                    {status === 'not_found' && (
                      <div className="text-center py-4">
                        <X className="w-12 h-12 mx-auto text-destructive mb-3" />
                        <p className="text-muted-foreground">Utilisateur introuvable</p>
                        <Button onClick={() => { setStatus('search'); setTargetProfile(null); }} className="mt-4">
                          Nouvelle recherche
                        </Button>
                      </div>
                    )}

                    {status === 'self' && (
                      <div className="text-center py-4">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">C'est votre propre profil</p>
                        <Button onClick={() => navigate('/profile')} className="mt-4">
                          Voir mon profil
                        </Button>
                      </div>
                    )}

                    {status === 'already_friends' && (
                      <div className="text-center py-4">
                        <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                        <p className="text-green-600 font-medium">Vous êtes déjà amis !</p>
                        <Button onClick={() => navigate('/chat')} className="mt-4 gap-2">
                          Aller au chat
                        </Button>
                      </div>
                    )}

                    {status === 'pending' && (
                      <div className="text-center py-4">
                        <Loader2 className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                        <p className="text-yellow-600 font-medium">Demande en attente</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Une demande d'ami est déjà en cours
                        </p>
                        <Button onClick={() => navigate('/chat')} className="mt-4">
                          Voir mes demandes
                        </Button>
                      </div>
                    )}

                    {status === 'ready' && !user && (
                      <div className="text-center py-4">
                        <LogIn className="w-12 h-12 mx-auto text-primary mb-3" />
                        <p className="text-muted-foreground mb-4">
                          Connectez-vous pour ajouter {targetProfile?.username} comme ami
                        </p>
                        <Button 
                          onClick={() => navigate(`/auth?redirect=/add-friend/${targetProfile?.id}`)} 
                          className="gap-2"
                        >
                          <LogIn className="w-4 h-4" />
                          Se connecter
                        </Button>
                      </div>
                    )}

                    {status === 'ready' && user && (
                      <div className="text-center py-4">
                        <UserPlus className="w-12 h-12 mx-auto text-primary mb-3" />
                        <p className="text-muted-foreground mb-4">
                          Voulez-vous envoyer une demande d'ami à {targetProfile?.username} ?
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => { setStatus('search'); setTargetProfile(null); }}
                          >
                            Annuler
                          </Button>
                          <Button 
                            onClick={sendFriendRequest} 
                            disabled={processing}
                            className="gap-2"
                          >
                            {processing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            Envoyer la demande
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AddFriend;
