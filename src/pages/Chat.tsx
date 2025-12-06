import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationsStore } from '@/hooks/useNotifications';
import { sendMessageToCAi, formatMarkdown, ChatMessage } from '@/lib/groq';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  MessageCircle, Users, UserPlus, Send, Search, Hash, 
  Settings, Bell, Phone, Video, Pin, Smile, Paperclip,
  MoreVertical, Check, X, Clock, Copy, RefreshCw, Loader2,
  Bot, Sparkles, Trash2, RotateCcw, StopCircle, Edit2, Mic,
  ChevronDown, History, AtSign, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder, VoiceMessage } from '@/components/ui/voice-recorder';
import { RoleBadge } from '@/components/RoleBadge';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
    friend_code: string;
  };
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  receiver_code: string;
  status: string;
  created_at: string;
  sender_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string | null;
  created_at: string;
  is_read: boolean;
  sender_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  friend_code: string;
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const CAI_FRIEND = {
  id: 'cai-assistant',
  user_id: 'cai',
  friend_id: 'cai',
  created_at: new Date().toISOString(),
  friend_profile: {
    id: 'cai',
    username: 'CAi',
    avatar_url: null,
    friend_code: 'CAI00',
  },
};

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotificationsStore();

  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [copied, setCopied] = useState(false);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreamingContent, setAiStreamingContent] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showAiHistory, setShowAiHistory] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchCurrentProfile = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, friend_code')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setCurrentProfile(data);
    }
  }, [user]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, created_at')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;
      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .in('id', friendIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const friendsWithProfiles = friendships.map(friendship => {
        const friendUserId = friendship.user_id === user.id 
          ? friendship.friend_id 
          : friendship.user_id;
        return { 
          ...friendship, 
          friend_profile: profileMap.get(friendUserId) || null 
        };
      });

      setFriends(friendsWithProfiles);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [user]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: received, error: recError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (recError) throw recError;

      const requestsWithProfiles = await Promise.all(
        (received || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', req.sender_id)
            .single();

          return { ...req, sender_profile: profile };
        })
      );

      setPendingRequests(requestsWithProfiles);

      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (!sentError) {
        setSentRequests(sent || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, [user]);

  const fetchMessages = useCallback(async (friendId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const senderIds = [...new Set((data || []).map(msg => msg.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const messagesWithProfiles = (data || []).map(msg => ({
        ...msg,
        sender_profile: profileMap.get(msg.sender_id) || null
      }));

      setMessages(messagesWithProfiles);
      
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', friendId)
        .then(() => {});
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await fetchCurrentProfile();
      await fetchFriends();
      await fetchPendingRequests();
      setLoading(false);
    };

    loadData();
  }, [user, navigate, fetchCurrentProfile, fetchFriends, fetchPendingRequests]);

  useEffect(() => {
    if (selectedFriend?.friend_profile?.id && selectedFriend.id !== 'cai-assistant') {
      fetchMessages(selectedFriend.friend_profile.id);
      setShowAiChat(false);
    } else if (selectedFriend?.id === 'cai-assistant') {
      setShowAiChat(true);
      setMessages([]);
    }
  }, [selectedFriend, fetchMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 150;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiMessages, aiStreamingContent, showScrollButton]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          if (selectedFriend?.friend_profile?.id === newMsg.sender_id) {
            setMessages((prev) => [...prev, { ...newMsg, sender_profile: profile || undefined }]);
          }
          
          addNotification({
            title: 'Nouveau message',
            message: `${profile?.username || 'Quelqu\'un'} vous a envoyé un message`,
            type: 'info',
          });
          
          toast.info(`Nouveau message de ${profile?.username || 'un ami'}`, {
            description: newMsg.content?.slice(0, 50) + '...',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend, addNotification]);

  useEffect(() => {
    const handleCopyClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('copy-code-btn')) {
        const codeId = target.getAttribute('data-code-id');
        if (codeId) {
          const codeElement = document.getElementById(codeId);
          if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent || '');
            target.textContent = 'Copié!';
            setTimeout(() => {
              target.textContent = 'Copier';
            }, 2000);
          }
        }
      }
    };

    document.addEventListener('click', handleCopyClick);
    return () => document.removeEventListener('click', handleCopyClick);
  }, []);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    if (showAiChat) {
      await sendAiMessage();
      return;
    }

    if (!selectedFriend?.friend_profile?.id) return;

    setSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.friend_profile.id,
          content: newMessage.trim(),
          message_type: 'text',
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { ...data, sender_profile: { username: currentProfile?.username || '', avatar_url: currentProfile?.avatar_url || null } },
      ]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSendingMessage(false);
    }
  };

  const sendAiMessage = async () => {
    if (!newMessage.trim() || aiLoading) return;

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setAiLoading(true);
    setAiStreamingContent('');

    try {
      const chatHistory: ChatMessage[] = aiMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content: userMessage.content });

      const response = await sendMessageToCAi(chatHistory, (chunk) => {
        setAiStreamingContent(chunk);
      });

      const aiResponse: AiMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
      };

      setAiMessages(prev => [...prev, aiResponse]);
      setAiStreamingContent('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur de communication avec CAi');
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiChat = () => {
    setAiMessages([]);
    setAiStreamingContent('');
  };

  const ensureUserExists = async (
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
        console.log('Users table not accessible, trying direct insert');
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
            console.log('RLS policy blocking, continuing with profiles only');
            return true;
          }
          console.error('Error ensuring user exists:', error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
      return false;
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .ilike('username', `%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (userSearchQuery.trim()) {
        searchUsers(userSearchQuery.trim());
      } else {
        setUserSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery, searchUsers]);

  const copyShareLink = async () => {
    if (!user) return;
    try {
      const shareUrl = `${window.location.origin}/add-friend/${user.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      toast.success('Lien de partage copié !');
      setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const addFriendByProfile = async (targetProfile: UserProfile) => {
    if (!user) return;
    
    if (targetProfile.id === user.id) {
      toast.error("Vous ne pouvez pas vous ajouter vous-même");
      return;
    }

    setAddingFriend(true);
    try {
      if (currentProfile) {
        await ensureUserExists(user.id, {
          username: currentProfile.username,
          avatar_url: currentProfile.avatar_url,
          friend_code: currentProfile.friend_code,
        }, user.email || undefined);
      }

      await ensureUserExists(targetProfile.id, {
        username: targetProfile.username,
        avatar_url: targetProfile.avatar_url,
        friend_code: targetProfile.friend_code,
      });

      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existingFriendship) {
        toast.error("Vous êtes déjà amis avec cet utilisateur");
        return;
      }

      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetProfile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast.error("Demande déjà envoyée");
        return;
      }

      const { data: reverseRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', targetProfile.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (reverseRequest) {
        toast.info("Cette personne vous a déjà envoyé une demande !");
        return;
      }

      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetProfile.id,
          receiver_code: targetProfile.friend_code,
          status: 'pending',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error("Une demande similaire existe déjà.");
        } else {
          throw insertError;
        }
        return;
      }

      toast.success(`Demande envoyée à ${targetProfile.username} !`);
      setUserSearchQuery('');
      setUserSearchResults([]);
      setShowAddFriend(false);
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error adding friend:', error);
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setAddingFriend(false);
    }
  };

  const addFriend = async () => {
    if (!user || !friendCode.trim()) return;

    const cleanCode = friendCode.trim();

    setAddingFriend(true);
    try {
      let targetProfile = null;
      
      const { data: byId } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .eq('id', cleanCode)
        .maybeSingle();
      
      if (byId) {
        targetProfile = byId;
      } else {
        const { data: byCode } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, friend_code')
          .eq('friend_code', cleanCode)
          .maybeSingle();
        targetProfile = byCode;
      }

      if (!targetProfile) {
        toast.error("Utilisateur introuvable");
        return;
      }

      await addFriendByProfile(targetProfile);
    } catch (error: any) {
      console.error('Error adding friend:', error);
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setAddingFriend(false);
    }
  };

  const legacyAddFriend = async () => {
    if (!user || !friendCode.trim()) return;

    const cleanCode = friendCode.trim().replace(/\D/g, '');
    
    if (cleanCode.length !== 5) {
      toast.error("Le code ami doit contenir 5 chiffres");
      return;
    }

    if (cleanCode === currentProfile?.friend_code) {
      toast.error("Vous ne pouvez pas vous ajouter vous-même");
      return;
    }

    setAddingFriend(true);
    try {
      const { data: targetProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .eq('friend_code', cleanCode)
        .maybeSingle();

      if (findError) {
        console.error('Find profile error:', findError);
        toast.error("Erreur lors de la recherche de l'utilisateur");
        return;
      }

      if (!targetProfile) {
        toast.error("Code ami invalide ou utilisateur introuvable");
        return;
      }

      if (currentProfile) {
        await ensureUserExists(user.id, {
          username: currentProfile.username,
          avatar_url: currentProfile.avatar_url,
          friend_code: currentProfile.friend_code,
        }, user.email || undefined);
      }

      await ensureUserExists(targetProfile.id, {
        username: targetProfile.username,
        avatar_url: targetProfile.avatar_url,
        friend_code: targetProfile.friend_code,
      });

      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (friendshipError) {
        console.error('Check friendship error:', friendshipError);
      }

      if (existingFriendship) {
        toast.error("Vous êtes déjà amis avec cet utilisateur");
        return;
      }

      const { data: existingRequest, error: requestError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetProfile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (requestError) {
        console.error('Check request error:', requestError);
      }

      if (existingRequest) {
        toast.error("Demande déjà envoyée");
        return;
      }

      const { data: reverseRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', targetProfile.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (reverseRequest) {
        toast.info("Cette personne vous a déjà envoyé une demande ! Vérifiez vos demandes reçues.");
        return;
      }

      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetProfile.id,
          receiver_code: cleanCode,
          status: 'pending',
        });

      if (insertError) {
        console.error('Insert friend request error:', insertError);
        if (insertError.code === '42501') {
          toast.error("Permission refusée. Veuillez vous reconnecter.");
        } else if (insertError.code === '23505') {
          toast.error("Une demande similaire existe déjà.");
        } else if (insertError.message?.includes('foreign key')) {
          toast.error("Erreur de synchronisation. Veuillez vous reconnecter.");
        } else {
          toast.error(`Erreur: ${insertError.message}`);
        }
        return;
      }

      toast.success("Demande d'ami envoyée !");
      setFriendCode('');
      setShowAddFriend(false);
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error adding friend:', error);
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setAddingFriend(false);
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    try {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .eq('id', senderId)
        .single();

      if (senderProfile) {
        await ensureUserExists(senderId, {
          username: senderProfile.username || '',
          avatar_url: senderProfile.avatar_url,
          friend_code: senderProfile.friend_code || '',
        });
      }

      if (currentProfile) {
        await ensureUserExists(user.id, {
          username: currentProfile.username,
          avatar_url: currentProfile.avatar_url,
          friend_code: currentProfile.friend_code,
        }, user.email || undefined);
      }

      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: senderId });

      if (friendshipError) {
        if (friendshipError.code === '23505') {
          toast.info("Vous êtes déjà amis !");
          await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);
        } else if (friendshipError.message?.includes('foreign key')) {
          const { error: retryError } = await supabase
            .from('friendships')
            .upsert({ user_id: user.id, friend_id: senderId }, { onConflict: 'user_id,friend_id' });
          
          if (retryError && retryError.code !== '23505') {
            toast.error("Erreur de synchronisation. Veuillez réessayer.");
            return;
          }
          toast.success("Demande acceptée !");
        } else {
          throw friendshipError;
        }
      } else {
        toast.success("Demande acceptée !");
        
        addNotification({
          title: 'Nouvel ami',
          message: 'Vous avez un nouvel ami !',
          type: 'info',
        });
      }
      
      fetchFriends();
      fetchPendingRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast.error(error.message || "Erreur lors de l'acceptation");
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      toast.success("Demande refusée");
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Erreur lors du refus");
    }
  };

  const copyFriendCode = async () => {
    if (!currentProfile?.friend_code) return;
    
    try {
      await navigator.clipboard.writeText(currentProfile.friend_code);
      setCopied(true);
      toast.success('Code ami copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const allFriends = [CAI_FRIEND, ...friends];
  const filteredFriends = allFriends.filter((f) =>
    f.friend_profile?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  if (!user) return null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden min-h-0">
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-secondary/20 border-r border-border flex flex-col flex-shrink-0 h-full overflow-hidden"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Messages
              </h2>
              <Button size="icon" variant="ghost" onClick={() => setShowAddFriend(true)}>
                <UserPlus className="w-5 h-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
          </div>

          <Tabs defaultValue="friends" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 grid grid-cols-2">
              <TabsTrigger value="friends" className="gap-1">
                <Users className="w-4 h-4" />
                Amis
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1 relative">
                <Bell className="w-4 h-4" />
                Demandes
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full px-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Aucun résultat</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-2">
                    {filteredFriends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                          selectedFriend?.id === friend.id
                            ? 'bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/40 shadow-lg shadow-primary/10'
                            : 'hover:bg-gradient-to-r hover:from-secondary/60 hover:to-secondary/40 border border-transparent hover:border-secondary'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-11 h-11 ring-2 ring-offset-2 ring-offset-background ring-secondary">
                            {friend.id === 'cai-assistant' ? (
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                <Bot className="w-5 h-5" />
                              </AvatarFallback>
                            ) : (
                              <>
                                <AvatarImage src={friend.friend_profile?.avatar_url || ''} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                                  {friend.friend_profile?.username?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </>
                            )}
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${friend.id === 'cai-assistant' ? 'bg-purple-500 ring-purple-500/30' : 'bg-emerald-500 ring-emerald-500/30'} ring-4 border-2 border-background rounded-full`} />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{friend.friend_profile?.username}</p>
                            {friend.id === 'cai-assistant' && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                IA
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {friend.id === 'cai-assistant' ? 'Toujours disponible' : 'En ligne'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full px-4">
                <div className="space-y-4 py-4">
                  {pendingRequests.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5" />
                        Reçues
                      </h3>
                      <div className="space-y-2">
                        {pendingRequests.map((req) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-secondary/50 to-secondary/30 border border-secondary hover:border-primary/30 transition-all"
                          >
                            <Avatar className="w-10 h-10 ring-2 ring-primary/30">
                              <AvatarImage src={req.sender_profile?.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                                {req.sender_profile?.username?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{req.sender_profile?.username}</p>
                              <p className="text-xs text-primary/80">
                                Veut être votre ami
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400"
                                onClick={() => acceptRequest(req.id, req.sender_id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                                onClick={() => rejectRequest(req.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sentRequests.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Envoyées
                      </h3>
                      <div className="space-y-2">
                        {sentRequests.map((req) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm text-amber-100">{req.receiver_code}</p>
                              <p className="text-xs text-amber-400/80">En attente de réponse...</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingRequests.length === 0 && sentRequests.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-secondary/50 to-secondary/30 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-muted-foreground font-medium">Aucune demande</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Les demandes d'amis apparaîtront ici</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="p-4 border-t border-border bg-gradient-to-t from-secondary/20 to-transparent">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-secondary/50 to-secondary/30 border border-secondary hover:border-primary/30 transition-all">
              <Avatar className="w-9 h-9 ring-2 ring-primary/30">
                <AvatarImage src={currentProfile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                  {currentProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentProfile?.username}</p>
                <p className="text-[10px] text-muted-foreground/80 font-mono">#{currentProfile?.friend_code}</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={copyFriendCode}
                className="h-8 w-8 hover:bg-primary/20"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {selectedFriend ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    {showAiChat ? (
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={selectedFriend.friend_profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                          {selectedFriend.friend_profile?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{selectedFriend.friend_profile?.username}</h3>
                      {showAiChat && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="w-3 h-3" />
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs flex items-center gap-1 ${showAiChat ? 'text-purple-500' : 'text-green-500'}`}>
                      <span className={`w-2 h-2 ${showAiChat ? 'bg-purple-500' : 'bg-green-500'} rounded-full`} />
                      {showAiChat ? 'Toujours disponible' : 'En ligne'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showAiChat && (
                    <>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setShowAiHistory(true)} 
                        title="Historique des conversations"
                      >
                        <History className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={clearAiChat} title="Effacer la conversation">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  {!showAiChat && (
                    <>
                      <Button size="icon" variant="ghost">
                        <Phone className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Video className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 relative min-h-0 overflow-y-auto" onScrollCapture={handleScroll}>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {showAiChat ? (
                    <>
                      {aiMessages.length === 0 && !aiStreamingContent ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <Bot className="w-10 h-10 text-purple-500" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Bonjour ! Je suis CAi</h3>
                          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            Je suis l'assistant IA de CStream, créé par CDZ. Je peux vous aider à découvrir des films, séries et animes !
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {['Recommande-moi un film', 'Quels animes regarder ?', "C'est quoi CStream ?"].map((suggestion) => (
                              <Button
                                key={suggestion}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewMessage(suggestion);
                                  inputRef.current?.focus();
                                }}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {aiMessages.map((msg) => {
                            const isOwn = msg.role === 'user';
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                              >
                                {!isOwn && (
                                  <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                      <Bot className="w-4 h-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                                  <div
                                    className={`inline-block px-4 py-2 rounded-2xl ${
                                      isOwn
                                        ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-sm'
                                        : 'bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30 text-white rounded-bl-sm shadow-lg shadow-purple-500/10'
                                    }`}
                                  >
                                    {isOwn ? (
                                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    ) : (
                                      <div 
                                        className="text-sm prose prose-sm prose-invert max-w-none [&_p]:text-gray-100 [&_strong]:text-white [&_li]:text-gray-100 [&_code]:text-pink-300 [&_code]:bg-black/30"
                                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                      />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatTime(msg.created_at)}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                          
                          {aiLoading && !aiStreamingContent && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-3"
                            >
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                  <Bot className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="max-w-[70%]">
                                <div className="inline-block px-4 py-3 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30 rounded-bl-sm shadow-lg shadow-purple-500/10">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      <motion.div
                                        className="w-2 h-2 bg-purple-400 rounded-full"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                                      />
                                      <motion.div
                                        className="w-2 h-2 bg-pink-400 rounded-full"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                                      />
                                      <motion.div
                                        className="w-2 h-2 bg-purple-400 rounded-full"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                                      />
                                    </div>
                                    <motion.span 
                                      className="text-sm text-purple-300 ml-1"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                      CAi réfléchit...
                                    </motion.span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                          
                          {aiStreamingContent && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-3"
                            >
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                  <Bot className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="max-w-[70%]">
                                <div className="inline-block px-4 py-2 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30 rounded-bl-sm shadow-lg shadow-purple-500/10">
                                  <div 
                                    className="text-sm prose prose-sm prose-invert max-w-none [&_p]:text-gray-100 [&_strong]:text-white [&_li]:text-gray-100 [&_code]:text-pink-300 [&_code]:bg-black/30"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(aiStreamingContent) }}
                                  />
                                  <motion.span 
                                    className="inline-block w-2 h-4 bg-purple-400 ml-1"
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {messages.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                          <p className="text-muted-foreground">Aucun message</p>
                          <p className="text-sm text-muted-foreground">Envoyez le premier message !</p>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg, idx) => {
                            const isOwn = msg.sender_id === user.id;
                            const showDate =
                              idx === 0 ||
                              formatDate(messages[idx - 1].created_at) !== formatDate(msg.created_at);

                            return (
                              <div key={msg.id}>
                                {showDate && (
                                  <div className="flex items-center gap-4 my-6">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(msg.created_at)}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                  </div>
                                )}
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                                >
                                  {!isOwn && (
                                    <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-secondary">
                                      <AvatarImage src={msg.sender_profile?.avatar_url || ''} />
                                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                                        {msg.sender_profile?.username?.charAt(0).toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                                    <div
                                      className={`inline-block px-4 py-2.5 rounded-2xl shadow-md ${
                                        isOwn
                                          ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-sm shadow-primary/20'
                                          : 'bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 text-gray-100 rounded-bl-sm shadow-black/20'
                                      }`}
                                    >
                                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {formatTime(msg.created_at)}
                                      {isOwn && msg.is_read && (
                                        <Check className="w-3 h-3 inline ml-1 text-blue-500" />
                                      )}
                                    </p>
                                  </div>
                                </motion.div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <AnimatePresence>
                  {showScrollButton && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
                    >
                      <Button
                        size="sm"
                        onClick={scrollToBottom}
                        className="rounded-full shadow-lg bg-primary hover:bg-primary/90 gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Nouveaux messages
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollArea>

              <div className="p-4 border-t border-border bg-secondary/10 flex-shrink-0">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  {!showAiChat && (
                    <Button size="icon" variant="ghost">
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  )}
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      placeholder={showAiChat ? "Demandez quelque chose à CAi..." : "Écrire un message..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="pr-12 bg-secondary/50"
                      disabled={aiLoading}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                  </div>
                  {!showAiChat && selectedFriend?.friend_profile?.id && (
                    <VoiceRecorder
                      onSend={async (audioBlob: Blob, duration: number) => {
                        if (!user || !selectedFriend?.friend_profile?.id) return;
                        try {
                          setSendingMessage(true);
                          
                          const { error } = await supabase
                            .from('messages')
                            .insert({
                              sender_id: user.id,
                              receiver_id: selectedFriend.friend_profile.id,
                              content: `[VOICE:${Math.round(duration)}s]`,
                              message_type: 'voice',
                              is_read: false
                            });

                          if (error) {
                            if (error.message?.includes('foreign key')) {
                              toast.error('Erreur de synchronisation utilisateur');
                            } else {
                              throw error;
                            }
                            return;
                          }
                          
                          toast.success('Message vocal envoyé');
                        } catch (error: any) {
                          console.error('Error sending voice message:', error);
                          toast.error(error.message || 'Erreur lors de l\'envoi du message vocal');
                        } finally {
                          setSendingMessage(false);
                        }
                      }}
                      disabled={sendingMessage}
                    />
                  )}
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage || aiLoading}
                    className={showAiChat 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                      : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    }
                  >
                    {sendingMessage || aiLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <MessageCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">CStream Chat</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Discutez avec vos amis ou avec CAi, l'assistant IA !
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={() => setSelectedFriend(CAI_FRIEND)} variant="outline" className="gap-2">
                    <Bot className="w-4 h-4" />
                    Parler à CAi
                  </Button>
                  <Button onClick={() => setShowAddFriend(true)} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Ajouter un ami
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Ajouter un ami
            </DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur par son nom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rechercher par nom d'utilisateur</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Entrez un nom d'utilisateur..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {userSearchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <ScrollArea className="h-48 rounded-lg border">
                    <div className="p-2 space-y-1">
                      {userSearchResults.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => addFriendByProfile(profile)}
                          disabled={addingFriend}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left disabled:opacity-50"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={profile.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                              {profile.username?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{profile.username}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              {profile.id.slice(0, 8)}...
                            </p>
                          </div>
                          {addingFriend ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {userSearchQuery.length >= 2 && userSearchResults.length === 0 && !searchingUsers && (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun utilisateur trouvé</p>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium text-center">Ou partagez votre lien d'invitation</p>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={copyShareLink}
              >
                {copiedShareLink ? (
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
              <p className="text-xs text-muted-foreground text-center">
                Vos amis pourront vous ajouter instantanément via ce lien
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAiHistory} onOpenChange={setShowAiHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Historique des conversations avec CAi
            </DialogTitle>
            <DialogDescription>
              Vos échanges précédents avec l'assistant IA
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            {aiMessages.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucun historique disponible</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Commencez une conversation avec CAi pour voir votre historique ici
                </p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {aiMessages.filter(m => m.role === 'user').map((msg, idx) => {
                  const aiResponse = aiMessages.find(
                    (m, i) => m.role === 'assistant' && i > aiMessages.indexOf(msg)
                  );
                  const title = msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '');
                  
                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowAiHistory(false);
                        scrollToBottom();
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleString('fr-FR')}
                          </p>
                          {aiResponse && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              CAi: {aiResponse.content.slice(0, 100)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAiHistory(false)}>
              Fermer
            </Button>
            {aiMessages.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  clearAiChat();
                  setShowAiHistory(false);
                  toast.success('Historique effacé');
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Effacer l'historique
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
