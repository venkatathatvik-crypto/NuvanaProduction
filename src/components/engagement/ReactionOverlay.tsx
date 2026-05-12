import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { engagementSocket } from '@/services/engagementSocket';

interface Reaction {
  id: string;
  emoji: string;
  studentName: string;
}

export const ReactionOverlay: React.FC = () => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    const handleReaction = (data: Reaction) => {
      setReactions((prev) => [...prev, data]);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== data.id));
      }, 3000);
    };

    engagementSocket.onReactionReceived(handleReaction);

    return () => {
      engagementSocket.off('reaction:received', handleReaction);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-end justify-center pb-12">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ y: 0, x: Math.random() * 200 - 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: -500 - Math.random() * 200, 
              x: (Math.random() * 200 - 100) * 2, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.5, 1.2, 0.8],
              rotate: Math.random() * 40 - 20
            }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute flex flex-col items-center gap-1"
          >
            <span className="text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
            <span className="text-[10px] font-medium text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {reaction.studentName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
