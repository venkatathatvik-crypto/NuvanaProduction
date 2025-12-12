import { motion } from "framer-motion";
import AiTutorChat from "@/components/AiTutor/AiTutorChat";

const AiTutorPage = () => {
    return (
        <div className="min-h-screen p-3 sm:p-6 bg-gradient-to-b from-background to-secondary/20">
            <div className="max-w-4xl mx-auto space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2 mb-8"
                >
                    <h1 className="text-3xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink p-1">
                        AI Personal Tutor
                    </h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        24/7 Academic support personalized to your learning style.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <AiTutorChat />
                </motion.div>
            </div>
        </div>
    );
};

export default AiTutorPage;
