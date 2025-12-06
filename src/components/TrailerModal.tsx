import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerKey: string | null;
  title?: string;
}

export const TrailerModal = ({ 
  open, 
  onOpenChange, 
  trailerKey, 
  title = 'Bande-annonce' 
}: TrailerModalProps) => {
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
    }
  }, [open, trailerKey]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById('trailer-iframe') as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  if (!trailerKey) return null;

  const embedUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&mute=${muted ? 1 : 0}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 bg-black/95 border-none overflow-hidden">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <DialogTitle className="text-white text-lg font-semibold truncate pr-4">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMuted(!muted)}
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative aspect-video w-full bg-black">
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black z-20"
              >
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-white mb-2 mx-auto" />
                  <p className="text-white/60 text-sm">Chargement de la bande-annonce...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <iframe
            id="trailer-iframe"
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={handleIframeLoad}
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrailerModal;
