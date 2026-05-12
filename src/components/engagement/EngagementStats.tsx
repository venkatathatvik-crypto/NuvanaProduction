import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Zap, Award, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface StatProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  delay?: number;
  isLoading?: boolean;
}

const StatCard = ({ label, value, icon: Icon, color, delay = 0, isLoading }: StatProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -2 }}
    className="h-full"
  >
    <Card className="glass-card h-full border-border/50 hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-xl bg-primary/5 ${color} border border-current opacity-80`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">{label}</span>
            </div>
          </div>
          <div className="mt-1">
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-primary/10" />
            ) : (
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</h3>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface EngagementStatsProps {
  stats: {
    label: string;
    value: string | number;
    icon: any;
    color: string;
  }[];
  isLoading?: boolean;
}

export const EngagementStats: React.FC<EngagementStatsProps> = ({ stats, isLoading }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)} gap-4 sm:gap-6`}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          delay={0.1 * (index + 1)}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};
