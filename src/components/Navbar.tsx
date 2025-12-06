import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from './RoleBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Film,
  Tv,
  Play,
  Users,
  LayoutDashboard,
  Sparkles,
  Home,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationsPanel } from './NotificationsPanel';
import { ChangelogWidget, ChangelogBadge } from './ChangelogWidget';

const navLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/movies', label: 'Films', icon: Film },
  { href: '/tv', label: 'Séries', icon: Tv },
  { href: '/anime', label: 'Anime', icon: Sparkles },
  { href: '/actors', label: 'Acteurs', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
];

interface UserProfile {
  username: string;
  avatar_url: string | null;
}

export const Navbar = () => {
  const { user, isAdmin, role, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5' 
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg glow"
              >
                <Play className="w-5 h-5 text-white fill-current" />
              </motion.div>
              <span className="text-xl font-bold hidden sm:block">
                <span className="gradient-text">CStream</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-secondary/50 backdrop-blur-sm">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      isActive
                        ? 'text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active"
                        className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:block flex-1 max-w-md">
              <SearchBar />
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <ChangelogBadge onClick={() => setChangelogOpen(true)} />
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative rounded-full hover:bg-secondary/60 transition-colors"
                      onClick={() => setNotificationsOpen(true)}
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-primary to-accent rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-lg"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </Button>
                  </motion.div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-secondary/60 p-0">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                              {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-xl glass-card p-2" align="end">
                      <div className="px-3 py-3 mb-2 rounded-lg bg-secondary/50">
                        <p className="text-sm font-semibold truncate">{profile?.username || user.email}</p>
                        <div className="mt-1">
                          <RoleBadge role={role} size="sm" />
                        </div>
                      </div>
                      <DropdownMenuItem onClick={() => navigate('/app')} className="rounded-lg cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Paramètres
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-lg cursor-pointer">
                          <Shield className="w-4 h-4 mr-2" />
                          Administration
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate('/auth')} className="rounded-full">
                    Se connecter
                  </Button>
                  <Button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-full shadow-lg glow text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    S'inscrire
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full hover:bg-secondary/60"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>

          <div className="md:hidden pb-4">
            <SearchBar />
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link, index) => {
                  const isActive = location.pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <ChangelogWidget open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  );
};
