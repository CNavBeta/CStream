import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'member';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  role: UserRole;
  auth_provider: string | null;
  friend_code: string;
  friend_code_refreshes?: number;
  last_friend_code_refresh?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditor: boolean;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshFriendCode: () => Promise<{ error: Error | null; newCode?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = 'chemsdine.kachid@gmail.com';

const generateFriendCode = (): string => {
  const min = 10000;
  const max = 99999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [role, setRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(true);

  const syncUserToUsersTable = async (userId: string, email: string, username: string, avatarUrl: string | null, friendCode: string) => {
    try {
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.log('Users table not accessible or RLS blocking, skipping sync');
        return;
      }

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: email,
            username: username,
            avatar_url: avatarUrl,
            user_code: friendCode,
            is_admin: false,
            is_online: true,
          }, { onConflict: 'id' });
        
        if (insertError) {
          if (insertError.message?.includes('row-level security') || insertError.code === '42501') {
            console.log('RLS policy blocking users table insert, using profiles only');
            return;
          }
          console.error('Error inserting user:', insertError);
        }
      } else {
        const updateData: Record<string, any> = { 
          is_online: true, 
          last_seen: new Date().toISOString(),
          username: username,
          avatar_url: avatarUrl,
          user_code: friendCode,
        };
        
        if (existingUser.email?.includes('@placeholder.local') && email && !email.includes('@placeholder.local')) {
          updateData.email = email;
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
        
        if (updateError) {
          if (updateError.message?.includes('row-level security') || updateError.code === '42501') {
            console.log('RLS policy blocking users table update, using profiles only');
            return;
          }
          console.error('Error updating user:', updateError);
        }
      }
    } catch (error) {
      console.error('Error syncing user to users table:', error);
    }
  };

  const checkUserProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      const isSuperAdminUser = userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      
      if (data) {
        let userRole: UserRole = (data.role as UserRole) || 'member';
        let friendCode = data.friend_code;
        
        if (friendCode && friendCode.length !== 5) {
          friendCode = generateFriendCode();
          await supabase
            .from('profiles')
            .update({ friend_code: friendCode })
            .eq('id', userId);
        }
        
        if (isSuperAdminUser && userRole !== 'super_admin') {
          userRole = 'super_admin';
          await supabase
            .from('profiles')
            .update({ is_admin: true, role: 'super_admin' })
            .eq('id', userId);
        }

        const profileData: UserProfile = {
          id: data.id,
          username: data.username || '',
          avatar_url: data.avatar_url,
          is_admin: data.is_admin || isSuperAdminUser,
          role: userRole,
          auth_provider: data.auth_provider || null,
          friend_code: friendCode || data.friend_code,
          friend_code_refreshes: data.friend_code_refreshes ?? 0,
          last_friend_code_refresh: data.last_friend_code_refresh ?? null,
        };

        await syncUserToUsersTable(
          userId,
          userEmail || '',
          profileData.username,
          profileData.avatar_url,
          profileData.friend_code
        );

        setProfile(profileData);
        setIsAdmin(profileData.is_admin || userRole === 'super_admin' || userRole === 'admin');
        setIsSuperAdmin(isSuperAdminUser);
        setIsEditor(userRole === 'editor' || userRole === 'admin' || userRole === 'super_admin');
        setRole(userRole);
      } else if (!data && !error) {
        const newFriendCode = generateFriendCode();
        const newProfile = {
          id: userId,
          username: userEmail?.split('@')[0] || 'user',
          is_admin: isSuperAdminUser,
          role: isSuperAdminUser ? 'super_admin' : 'member',
          auth_provider: 'email',
          friend_code: newFriendCode,
          friend_code_refreshes: 0,
        };
        
        await supabase.from('profiles').insert(newProfile);

        await syncUserToUsersTable(
          userId,
          userEmail || '',
          newProfile.username,
          null,
          newFriendCode
        );
        
        setProfile({
          ...newProfile,
          avatar_url: null,
        } as UserProfile);
        
        setIsAdmin(isSuperAdminUser);
        setIsSuperAdmin(isSuperAdminUser);
        setRole(isSuperAdminUser ? 'super_admin' : 'member');
      }
    } catch (error) {
      console.error('Error in checkUserProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await checkUserProfile(user.id, user.email);
    }
  };

  const refreshFriendCode = async (): Promise<{ error: Error | null; newCode?: string }> => {
    if (!user || !profile) {
      return { error: new Error('Utilisateur non connecté') };
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const lastRefreshMonth = profile.last_friend_code_refresh 
      ? `${new Date(profile.last_friend_code_refresh).getFullYear()}-${new Date(profile.last_friend_code_refresh).getMonth()}`
      : null;

    let refreshCount = profile.friend_code_refreshes || 0;
    
    if (lastRefreshMonth !== currentMonth) {
      refreshCount = 0;
    }

    if (refreshCount >= 3) {
      return { error: new Error('Vous avez atteint la limite de 3 rechargements par mois') };
    }

    const newCode = generateFriendCode();
    
    const { error } = await supabase
      .from('profiles')
      .update({
        friend_code: newCode,
        friend_code_refreshes: refreshCount + 1,
        last_friend_code_refresh: now.toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { error: new Error(error.message) };
    }

    setProfile(prev => prev ? {
      ...prev,
      friend_code: newCode,
      friend_code_refreshes: refreshCount + 1,
      last_friend_code_refresh: now.toISOString(),
    } : null);

    return { error: null, newCode };
  };

  const notifyDiscord = async (type: string, data: object) => {
    try {
      await supabase.functions.invoke('discord-webhook', {
        body: { type, data }
      });
    } catch (error) {
      console.error('Failed to notify Discord:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserProfile(session.user.id, session.user.email);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsEditor(false);
          setRole('member');
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error) {
      notifyDiscord('user_login', { email });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { 
            username: username || email.split('@')[0],
          }
        }
      });
      
      if (error) {
        console.error('SignUp error:', error);
        return { error };
      }
      
      if (data.user) {
        const isSuperAdminUser = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        const newFriendCode = generateFriendCode();
        
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username || email.split('@')[0],
          is_admin: isSuperAdminUser,
          role: isSuperAdminUser ? 'super_admin' : 'member',
          auth_provider: 'email',
          friend_code: newFriendCode,
          friend_code_refreshes: 0,
        }, {
          onConflict: 'id'
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
        
        notifyDiscord('new_user', { email, username });
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('SignUp exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsEditor(false);
    setRole('member');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      isAdmin, 
      isSuperAdmin,
      isEditor,
      role,
      loading, 
      signIn, 
      signUp, 
      signOut,
      refreshProfile,
      refreshFriendCode,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
