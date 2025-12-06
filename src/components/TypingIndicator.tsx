import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  username?: string;
}

export const TypingIndicator = ({ username = 'CAi' }: TypingIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-4"
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
        />
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary">{username}</span>
        <div className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 rounded-full bg-primary"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 rounded-full bg-primary"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 rounded-full bg-primary"
          />
          <span className="ml-2 text-xs text-muted-foreground">en train d'écrire</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
