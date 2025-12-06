import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ 
  text, 
  disabled = false, 
  speed = 5, 
  className = '' 
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span 
      className={`inline-block bg-clip-text ${disabled ? '' : 'animate-shine'} ${className}`}
      style={{ 
        backgroundImage: disabled 
          ? 'none' 
          : 'linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 60%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        animationDuration,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}
    >
      {text}
      <style>{`
        @keyframes shine {
          0% { background-position: 100% 50%; }
          100% { background-position: -100% 50%; }
        }
        .animate-shine {
          animation-name: shine;
        }
      `}</style>
    </span>
  );
};

export default ShinyText;
