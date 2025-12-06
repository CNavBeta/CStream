import React from 'react';

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties['animationDuration'];
  thickness?: number;
};

const StarBorder = <T extends React.ElementType = 'button'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || 'button';

  return (
    <Component
      className={`star-border-container relative overflow-hidden ${className}`}
      {...(rest as any)}
      style={{
        padding: `${thickness}px 0`,
        ...(rest as any).style
      }}
    >
      <div
        className="border-gradient-bottom absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-move ${speed} linear infinite`,
        }}
      />
      <div
        className="border-gradient-top absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-move ${speed} linear infinite reverse`,
        }}
      />
      <div className="inner-content relative z-10">{children}</div>
      <style>{`
        @keyframes star-move {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Component>
  );
};

export default StarBorder;
