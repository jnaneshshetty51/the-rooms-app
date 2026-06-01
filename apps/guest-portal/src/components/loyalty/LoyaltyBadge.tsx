'use client';

// apps/guest-portal/src/components/loyalty/LoyaltyBadge.tsx
// Loyalty tier badge (Bronze/Silver/Gold)

import { cn } from '@the-rooms/ui';
import { Award, Star } from 'lucide-react';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'NONE';

interface LoyaltyBadgeProps {
  tier: LoyaltyTier;
  nextTier?: { name: string; progress: number }; // e.g., { name: 'Gold', progress: 75 }
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_CONFIG = {
  BRONZE: {
    label: 'Bronze',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
    progressColor: 'bg-amber-500',
    stars: 1,
  },
  SILVER: {
    label: 'Silver',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-600',
    iconColor: 'text-gray-500',
    progressColor: 'bg-gray-400',
    stars: 2,
  },
  GOLD: {
    label: 'Gold',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-500',
    progressColor: 'bg-yellow-500',
    stars: 3,
  },
  NONE: {
    label: 'Member',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-500',
    iconColor: 'text-gray-400',
    progressColor: 'bg-gray-400',
    stars: 0,
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    font: 'text-xs',
    stars: 'w-3 h-3',
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    font: 'text-sm',
    stars: 'w-3.5 h-3.5',
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    font: 'text-base',
    stars: 'w-4 h-4',
  },
};

export function LoyaltyBadge({ 
  tier, 
  nextTier, 
  className, 
  showLabel = true,
  size = 'md',
}: LoyaltyBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className={className}>
      <div className={cn(
        'inline-flex items-center gap-2 rounded-full border font-medium',
        config.bgColor,
        config.borderColor,
        sizeConfig.badge
      )}>
        <Award className={cn(config.iconColor, sizeConfig.icon)} />
        <span className={cn(config.textColor, 'font-semibold')}>
          {config.label}
        </span>
        {config.stars > 0 && (
          <div className="flex items-center gap-0.5">
            {[...Array(3)].map((_, i) => (
              <Star 
                key={i}
                className={cn(
                  sizeConfig.stars,
                  i < config.stars ? config.iconColor : 'text-gray-300'
                )}
                fill={i < config.stars ? 'currentColor' : 'none'}
              />
            ))}
          </div>
        )}
      </div>

      {nextTier && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#636E72]">
              {nextTier.progress}% to {nextTier.name}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full transition-all', config.progressColor)}
              style={{ width: `${nextTier.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Demo/example component
export function LoyaltyShowcase() {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Loyalty Tiers</h3>
      <div className="space-y-3">
        <LoyaltyBadge tier="BRONZE" size="md" />
        <LoyaltyBadge tier="SILVER" size="md" />
        <LoyaltyBadge tier="GOLD" size="md" />
        <LoyaltyBadge tier="NONE" size="md" />
      </div>
      
      <h3 className="text-lg font-semibold mt-6">With Progress</h3>
      <div className="space-y-3">
        <LoyaltyBadge 
          tier="SILVER" 
          nextTier={{ name: 'Gold', progress: 75 }}
          size="md" 
        />
        <LoyaltyBadge 
          tier="BRONZE" 
          nextTier={{ name: 'Silver', progress: 45 }}
          size="md" 
        />
      </div>
    </div>
  );
}

export default LoyaltyBadge;