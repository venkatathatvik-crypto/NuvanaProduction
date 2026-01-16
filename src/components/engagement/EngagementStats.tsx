import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  delay?: number;
}

const StatCard = ({ label, value, icon: Icon, color, delay = 0 }: StatProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
  >
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <h3 className="text-3xl font-bold">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface EngagementStatsProps {
  stats: {
    totalSessions: number;
    totalQuestions: number;
    avgParticipation: string;
    avgAccuracy: string;
  };
}

export const EngagementStats: React.FC<EngagementStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Total Sessions"
        value={stats.totalSessions}
        icon={Users}
        color="text-blue-500"
        delay={0.1}
      />
      <StatCard
        label="Questions Sent"
        value={stats.totalQuestions}
        icon={Target}
        color="text-red-500"
        delay={0.2}
      />
      <StatCard
        label="Avg Participation"
        value={stats.avgParticipation}
        icon={Zap}
        color="text-yellow-500"
        delay={0.3}
      />
      <StatCard
        label="Avg Accuracy"
        value={stats.avgAccuracy}
        icon={Award}
        color="text-green-500"
        delay={0.4}
      />
    </div>
  );
};
