import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onSend, onCancel, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      startTimeRef.current = Date.now();
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      reset();
    }
  }, [audioBlob, duration, onSend]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
    onCancel?.();
  }, [audioUrl, onCancel]);

  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 p-2 rounded-full bg-secondary/50"
      >
        <audio 
          ref={audioRef} 
          src={audioUrl || ''} 
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlayback}
          className="rounded-full w-8 h-8"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="h-1 flex-1 bg-primary/30 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              animate={{ width: isPlaying ? '100%' : '0%' }}
              transition={{ duration: duration }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {formatDuration(duration)}
          </span>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={reset}
          className="rounded-full w-8 h-8 text-red-500 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          onClick={handleSend}
          className="rounded-full w-10 h-10 bg-gradient-to-r from-primary to-accent"
        >
          <Send className="w-4 h-4 text-white" />
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isRecording ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-3 p-2 rounded-full bg-red-500/10 border border-red-500/20"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <span className="text-sm font-mono text-red-500">
            {formatDuration(duration)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={stopRecording}
            className="rounded-full w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-500"
          >
            <Square className="w-4 h-4" />
          </Button>
        </motion.div>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          onClick={startRecording}
          disabled={disabled}
          className="rounded-full hover:bg-secondary/60"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </AnimatePresence>
  );
};

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  isOwn?: boolean;
}

export const VoiceMessage = ({ audioUrl, duration, isOwn }: VoiceMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-2xl min-w-[180px] ${
      isOwn 
        ? 'bg-gradient-to-r from-primary to-accent' 
        : 'bg-secondary/50'
    }`}>
      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        className="hidden"
      />
      
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={`rounded-full w-8 h-8 ${isOwn ? 'text-white hover:bg-white/20' : ''}`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${isOwn ? 'bg-white/30' : 'bg-primary/30'}`}>
          <div 
            className={`h-full transition-all ${isOwn ? 'bg-white' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className={`text-xs font-mono ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}>
        {formatDuration(duration)}
      </span>
    </div>
  );
};
