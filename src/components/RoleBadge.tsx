import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Edit3, User, MessageCircle } from 'lucide-react';
import type { UserRole } from '@/hooks/useAuth';

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const roleConfig: Record<UserRole, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    variant: 'default',
    className: 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    variant: 'destructive',
    className: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0',
  },
  editor: {
    label: 'Éditeur',
    icon: Edit3,
    variant: 'secondary',
    className: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0',
  },
  member: {
    label: 'Membre',
    icon: User,
    variant: 'outline',
    className: 'bg-secondary/50 text-muted-foreground border-border',
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const RoleBadge = ({ 
  role, 
  showIcon = true, 
  size = 'sm',
  className = '' 
}: RoleBadgeProps) => {
  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} gap-1 font-medium ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};

interface DiscordBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DiscordBadge = ({ size = 'sm', className = '' }: DiscordBadgeProps) => {
  return (
    <Badge 
      variant="secondary"
      className={`bg-[#5865F2] hover:bg-[#4752C4] text-white border-0 ${sizeClasses[size]} gap-1 font-medium ${className}`}
    >
      <MessageCircle className={iconSizes[size]} />
      Discord
    </Badge>
  );
};

export default RoleBadge;
