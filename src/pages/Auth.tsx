import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Play, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 640 512" fill="currentColor">
    <path d="M524.5 69.8a485.1 485.1 0 0 0-120.4-37.1c-1-.2-2 .3-2.5 1.2a337.5 337.5 0 0 0-14.9 30.6 447.8 447.8 0 0 0-134.4 0 309.5 309.5 0 0 0-15.1-30.6c-.5-.9-1.5-1.4-2.5-1.2A483.7 483.7 0 0 0 112 69.9c-.3.1-.6.3-.8.6C39.1 183.7 18.2 294.7 28.4 404.4c.1.5.4 1 .8 1.3A487.7 487.7 0 0 0 176 479.9c.8.2 1.6-.1 2.1-.7a348.2 348.2 0 0 0 29.9-49.5c.5-.9.1-2-.9-2.4a321.2 321.2 0 0 1-45.9-21.9 1.9 1.9 0 0 1-.2-3.1 251 251 0 0 0 9.1-7.1c.6-.5 1.4-.7 2.1-.3 96.2 43.9 200.4 43.9 295.5 0 .7-.3 1.5-.2 2.1.3 3 2.4 6 4.8 9.1 7.2.8.6 1 1.7.2 2.5a301.4 301.4 0 0 1-45.9 21.8c-1 .4-1.4 1.5-.9 2.5a391.1 391.1 0 0 0 30 48.8c.5.8 1.3 1.1 2.1.7a486 486 0 0 0 147.6-74.2c.4-.3.7-.8.8-1.3 12.3-126.8-20.5-236.9-86.9-334.5ZM222.5 337.6c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.4 59.2-52.8 59.2Zm195.4 0c-28.9 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.2 59.2-52.8 59.2Z" />
  </svg>
);

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Connexion réussie!');
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }
    const { error } = await signUp(email, password, username);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Inscription réussie! Vérifiez votre email pour confirmer.');
    }
    setLoading(false);
  };

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      // Build redirect URL using the Replit domain for proper OAuth callback
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { 
          redirectTo: redirectUrl,
          scopes: 'identify email',
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Discord login error:', error);
      toast.error('Erreur lors de la connexion Discord');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/30 rounded-full blur-[150px] translate-x-1/2 translate-y-1/2" />
      <div className="absolute inset-0 bg-noise opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-primary/20 shadow-2xl shadow-primary/10">
          <CardHeader className="text-center space-y-4 pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.2 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-primary via-accent to-primary rounded-2xl flex items-center justify-center shadow-xl glow"
            >
              <Play className="w-8 h-8 text-white fill-current" />
            </motion.div>
            <div>
              <CardTitle className="text-3xl font-bold">
                <span className="gradient-text">CStream</span>
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Votre univers de streaming illimité
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-secondary/50 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Connexion
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button
                      type="button"
                      onClick={handleDiscordLogin}
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-[#5865F2]/30 transition-all duration-300"
                    >
                      <DiscordIcon />
                      <span>Continuer avec Discord</span>
                    </Button>
                  </motion.div>

                  <div className="relative my-6">
                    <Separator className="bg-border/50" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email
                    </Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="votre@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                      autoComplete="email"
                      className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Mot de passe
                    </Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      autoComplete="current-password"
                      className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 glow"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Se connecter</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button
                      type="button"
                      onClick={handleDiscordLogin}
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-[#5865F2]/30 transition-all duration-300"
                    >
                      <DiscordIcon />
                      <span>S'inscrire avec Discord</span>
                    </Button>
                  </motion.div>

                  <div className="relative my-6">
                    <Separator className="bg-border/50" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Nom d'utilisateur
                    </Label>
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="MonPseudo" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                      className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email
                    </Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="votre@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required
                      autoComplete="email" 
                      className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Mot de passe
                    </Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required
                      autoComplete="new-password" 
                      className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 glow"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Créer mon compte</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>
            </Tabs>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-xs text-muted-foreground mt-6"
            >
              En continuant, vous acceptez nos conditions d'utilisation
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
