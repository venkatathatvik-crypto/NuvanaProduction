import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

const StudentFeedback = () => {
    const navigate = useNavigate();
    const [submitted, setSubmitted] = useState(false);
    const [ratings, setRatings] = useState({
        overall: 0,
        teaching: 0,
        facilities: 0
    });
    const [comment, setComment] = useState("");

    const handleRating = (category: keyof typeof ratings, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = () => {
        if (ratings.overall === 0 || ratings.teaching === 0 || ratings.facilities === 0) {
            toast.error("Please provide ratings for all categories.");
            return;
        }

        // Mock submission
        logger.log({ ratings, comment });
        setSubmitted(true);
        toast.success("Feedback submitted successfully!");
    };

    const StarRating = ({ category, value }: { category: keyof typeof ratings, value: number }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => handleRating(category, star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                >
                    <Star
                        className={`w-8 h-8 ${star <= value
                                ? "text-neon-pink fill-neon-pink"
                                : "text-muted-foreground/30 hover:text-neon-pink/50"
                            }`}
                    />
                </button>
            ))}
        </div>
    );

    if (submitted) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full"
                >
                    <Card className="glass-card p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold">Thank You!</h2>
                        <p className="text-muted-foreground">
                            Your feedback has been recorded. We appreciate your input in helping us improve.
                        </p>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 sm:gap-4"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/student")}
                        className="shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                    <h1 className="text-3xl font-bold neon-text">Annual Feedback</h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="glass-card p-8 space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">How was your experience this year?</h2>
                            <p className="text-muted-foreground text-sm">
                                Your feedback is anonymous and helps us improve the learning environment.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="font-medium">Overall Satisfaction</label>
                                <StarRating category="overall" value={ratings.overall} />
                            </div>

                            <div className="space-y-3">
                                <label className="font-medium">Teaching Quality</label>
                                <StarRating category="teaching" value={ratings.teaching} />
                            </div>

                            <div className="space-y-3">
                                <label className="font-medium">Campus Facilities</label>
                                <StarRating category="facilities" value={ratings.facilities} />
                            </div>

                            <div className="space-y-3">
                                <label className="font-medium">Additional Comments</label>
                                <Textarea
                                    placeholder="Share any specific suggestions or concerns..."
                                    className="bg-secondary/30 border-white/10 min-h-[120px]"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                            onClick={handleSubmit}
                        >
                            <Send className="w-5 h-5 mr-2" />
                            Submit Feedback
                        </Button>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default StudentFeedback;
