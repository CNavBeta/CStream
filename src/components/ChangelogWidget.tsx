import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bell, Users, MessageCircle, Palette, Zap, Bug, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangelogItem {
  version: string;
  date: string;
  isNew?: boolean;
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'ui';
    title: string;
    description?: string;
  }[];
}

const changelog: ChangelogItem[] = [
  {
    version: 'v0.3 beta',
    date: '5 Décembre 2025',
    isNew: true,
    changes: [
      { type: 'feature', title: 'Ajout de liens par admins/éditeurs', description: 'Les admins peuvent ajouter des sources directement sur les pages média' },
      { type: 'feature', title: 'Messages vocaux', description: 'Enregistrement et envoi de messages vocaux dans le chat' },
      { type: 'feature', title: 'Statut en ligne/hors ligne', description: 'Voir le statut de vos amis en temps réel' },
      { type: 'improvement', title: 'Notifications améliorées', description: 'Système de notifications plus fiable' },
      { type: 'ui', title: 'Animations de scroll', description: 'Nouvelles animations fluides au défilement' },
      { type: 'fix', title: 'Correction système d\'amis', description: 'Résolu le problème de clé étrangère' },
      { type: 'ui', title: 'Nouveau design des boutons', description: 'Effets StarBorder et ShinyText' },
    ]
  },
  {
    version: 'v0.2 beta',
    date: '4 Décembre 2025',
    changes: [
      { type: 'feature', title: 'Chat IA avec CAi', description: 'Assistant IA intégré avec streaming' },
      { type: 'feature', title: 'Import groupé d\'épisodes', description: 'Import en masse pour les admins' },
      { type: 'improvement', title: 'i18n', description: '10 langues supportées' },
      { type: 'fix', title: 'Corrections diverses', description: 'Nombreuses corrections de bugs' },
    ]
  }
];

const typeIcons = {
  feature: Sparkles,
  fix: Bug,
  improvement: Zap,
  ui: Palette,
};

const typeColors = {
  feature: 'text-purple-500 bg-purple-500/10',
  fix: 'text-red-500 bg-red-500/10',
  improvement: 'text-blue-500 bg-blue-500/10',
  ui: 'text-pink-500 bg-pink-500/10',
};

const typeLabels = {
  feature: 'Nouveauté',
  fix: 'Correction',
  improvement: 'Amélioration',
  ui: 'Interface',
};

interface ChangelogWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const ChangelogWidget = ({ open, onClose }: ChangelogWidgetProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Mises à jour</h2>
                  <p className="text-xs text-muted-foreground">Nouveautés de CStream</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="h-[60vh] p-4">
              <div className="space-y-6">
                {changelog.map((release, idx) => (
                  <div key={release.version} className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {release.version}
                        {release.isNew && (
                          <Badge className="bg-gradient-to-r from-primary to-accent text-white text-xs">
                            NEW
                          </Badge>
                        )}
                      </h3>
                      <span className="text-xs text-muted-foreground">{release.date}</span>
                    </div>

                    <div className="space-y-2 ml-2">
                      {release.changes.map((change, changeIdx) => {
                        const Icon = typeIcons[change.type];
                        return (
                          <motion.div
                            key={changeIdx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 + changeIdx * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            <div className={`p-1.5 rounded-lg ${typeColors[change.type]}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{change.title}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {typeLabels[change.type]}
                                </Badge>
                              </div>
                              {change.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {change.description}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {idx < changelog.length - 1 && (
                      <div className="h-px bg-border mt-6" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-secondary/20">
              <p className="text-xs text-center text-muted-foreground">
                CStream v0.3 beta - Créé par CDZ
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ChangelogBadge = ({ onClick }: { onClick: () => void }) => {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    const latestVersion = changelog[0]?.version;
    if (lastSeen !== latestVersion) {
      setHasNew(true);
    }
  }, []);

  const handleClick = () => {
    localStorage.setItem('changelog-last-seen', changelog[0]?.version || '');
    setHasNew(false);
    onClick();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="relative gap-2 text-xs"
    >
      <Star className="w-4 h-4" />
      v0.3 beta
      {hasNew && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center"
        >
          <span className="text-[8px] text-white font-bold">!</span>
        </motion.span>
      )}
    </Button>
  );
};
