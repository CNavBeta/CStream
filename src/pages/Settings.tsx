import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Palette, Bell, Shield, Globe, Check, Languages, Play, Save, Loader2, Monitor, Smartphone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n';
import { useUserSettings } from '@/hooks/useUserSettings';

const themes = [
  { id: 'dark-purple', name: 'Purple Night', colors: ['#8B5CF6', '#1a1a2e'], isDark: true },
  { id: 'dark-blue', name: 'Ocean Deep', colors: ['#3B82F6', '#0f172a'], isDark: true },
  { id: 'dark-green', name: 'Forest', colors: ['#22C55E', '#14532d'], isDark: true },
  { id: 'dark-pink', name: 'Sakura', colors: ['#EC4899', '#1f1f1f'], isDark: true },
  { id: 'dark-orange', name: 'Sunset', colors: ['#F97316', '#1c1917'], isDark: true },
  { id: 'dark-cyan', name: 'Neon', colors: ['#06B6D4', '#0a0a0a'], isDark: true },
  { id: 'dark-red', name: 'Crimson', colors: ['#EF4444', '#1f1f1f'], isDark: true },
  { id: 'light-purple', name: 'Lavender', colors: ['#8B5CF6', '#faf5ff'], isDark: false },
  { id: 'light-blue', name: 'Sky', colors: ['#3B82F6', '#f0f9ff'], isDark: false },
  { id: 'light-green', name: 'Mint', colors: ['#22C55E', '#f0fdf4'], isDark: false },
  { id: 'light-pink', name: 'Rose', colors: ['#EC4899', '#fdf2f8'], isDark: false },
];

interface SessionInfo {
  ip: string;
  city: string;
  country: string;
  device: string;
  browser: string;
  lastLogin: string;
}

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language: currentLanguage, setLanguage } = useI18n();
  const { settings, setTheme, setNotifications, setAutoplay, saving } = useUserSettings();
  
  const [selectedTheme, setSelectedTheme] = useState(settings.theme);
  const [notifications, setLocalNotifications] = useState(settings.notifications);
  const [autoPlay, setLocalAutoPlay] = useState(settings.autoplay);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    setSelectedTheme(settings.theme);
    setLocalNotifications(settings.notifications);
    setLocalAutoPlay(settings.autoplay);
  }, [settings]);

  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const userAgent = navigator.userAgent;
        let browser = 'Inconnu';
        let device = 'Ordinateur';
        
        if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('Opera')) browser = 'Opera';
        
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
          device = 'Mobile';
        } else if (/Tablet|iPad/i.test(userAgent)) {
          device = 'Tablette';
        }
        
        setSessionInfo({
          ip: data.ip || 'Non disponible',
          city: data.city || 'Inconnue',
          country: data.country_name || 'Inconnu',
          device,
          browser,
          lastLogin: new Date().toLocaleString('fr-FR'),
        });
      } catch (error) {
        console.error('Error fetching session info:', error);
        setSessionInfo({
          ip: 'Non disponible',
          city: 'Inconnue',
          country: 'Inconnu',
          device: 'Inconnu',
          browser: 'Inconnu',
          lastLogin: new Date().toLocaleString('fr-FR'),
        });
      } finally {
        setLoadingSession(false);
      }
    };
    
    fetchSessionInfo();
  }, []);

  if (!user) {
    navigate('/auth');
    return null;
  }

  useEffect(() => {
    document.documentElement.className = selectedTheme;
  }, [selectedTheme]);

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    setTheme(themeId);
    toast.success(t('common.success'));
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    toast.success(t('common.success'));
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setLocalNotifications(newNotifications);
    setNotifications(newNotifications);
  };

  const handleAutoPlayChange = (value: boolean) => {
    setLocalAutoPlay(value);
    setAutoplay(value);
  };

  const notificationOptions = [
    { key: 'newContent' as const, label: t('notifications.newContent'), desc: 'Soyez notifié des nouveaux films et séries' },
    { key: 'updates' as const, label: 'Mises à jour', desc: "Notifications sur les mises à jour de l'app" },
    { key: 'recommendations' as const, label: 'Recommandations', desc: 'Suggestions personnalisées basées sur vos goûts' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-xl bg-primary/10">
            <SettingsIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">Personnalisez votre expérience CStream</p>
          </div>
          {saving && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sauvegarde...
            </div>
          )}
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  {t('settings.appearance')}
                </CardTitle>
                <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-4 block text-sm font-medium">{t('settings.darkThemes')}</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {themes.filter(t => t.isDark).map((theme) => (
                      <motion.button
                        key={theme.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`relative p-1 rounded-xl transition-all focus:outline-none ${
                          selectedTheme === theme.id
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'hover:ring-2 hover:ring-white/20'
                        }`}
                      >
                        <div
                          className="w-full aspect-square rounded-lg flex items-end justify-center overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 100%)`,
                          }}
                        >
                          {selectedTheme === theme.id && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center bg-black/30"
                            >
                              <Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-xs text-center mt-1.5 text-muted-foreground truncate">{theme.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="mb-4 block text-sm font-medium">{t('settings.lightThemes')}</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {themes.filter(t => !t.isDark).map((theme) => (
                      <motion.button
                        key={theme.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`relative p-1 rounded-xl transition-all focus:outline-none ${
                          selectedTheme === theme.id
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'hover:ring-2 hover:ring-white/20'
                        }`}
                      >
                        <div
                          className="w-full aspect-square rounded-lg flex items-end justify-center overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 100%)`,
                          }}
                        >
                          {selectedTheme === theme.id && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center bg-black/30"
                            >
                              <Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-xs text-center mt-1.5 text-muted-foreground truncate">{theme.name}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" />
                  {t('settings.language')}
                </CardTitle>
                <CardDescription>Choisissez votre langue préférée pour l'interface et le contenu TMDB</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <motion.button
                      key={lang.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        currentLanguage === lang.code
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <div className="font-medium text-sm">{lang.nativeName}</div>
                      <div className={`text-xs ${currentLanguage === lang.code ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {lang.name}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  {t('settings.notifications')}
                </CardTitle>
                <CardDescription>Gérez vos préférences de notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationOptions.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <Label className="text-sm font-medium">{label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[key]}
                      onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Lecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <Label className="text-sm font-medium">{t('settings.autoplay')}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Lancer automatiquement l'épisode suivant</p>
                  </div>
                  <Switch checked={autoPlay} onCheckedChange={handleAutoPlayChange} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {t('settings.privacy')}
                </CardTitle>
                <CardDescription>Gérez vos données personnelles et la sécurité de votre compte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-white/5 transition-colors border-white/10"
                  >
                    Télécharger mes données
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                  >
                    Supprimer mon compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  Session actuelle
                </CardTitle>
                <CardDescription>Informations sur votre connexion actuelle</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSession ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : sessionInfo ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Globe className="w-4 h-4" />
                        <span className="text-xs">Adresse IP</span>
                      </div>
                      <p className="font-mono text-sm">{sessionInfo.ip}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">Localisation</span>
                      </div>
                      <p className="text-sm">{sessionInfo.city}, {sessionInfo.country}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        {sessionInfo.device === 'Mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                        <span className="text-xs">Appareil</span>
                      </div>
                      <p className="text-sm">{sessionInfo.device} - {sessionInfo.browser}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Dernière connexion</span>
                      </div>
                      <p className="text-sm">{sessionInfo.lastLogin}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Impossible de charger les informations de session
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
