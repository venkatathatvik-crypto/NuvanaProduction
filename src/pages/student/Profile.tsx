import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Award, BookOpen, Star, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getStudentData } from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/supabase/client";

const StudentProfile = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string>("");

    // Mock logic for feedback activation (once a year)
    // For demo purposes, we'll toggle this with a state or just set it to true
    const [isFeedbackActive] = useState(true);

    useEffect(() => {
        const fetchStudentDetails = async () => {
            if (profileLoading) return;

            if (!profile) {
                setLoading(false);
                return;
            }

            try {
                // Get user email from auth
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || "");
                }

                // Get student data including class_id
                const data = await getStudentData(profile.id);
                if (data) {
                    setStudentData(data);
                }
            } catch (error) {
                console.error("Error fetching student details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentDetails();
    }, [profile, profileLoading]);

    if (loading || profileLoading) {
        return <LoadingSpinner />;
    }

    if (!profile || !studentData) {
        return (
            <div className="min-h-screen p-6 bg-background flex items-center justify-center">
                <Card className="glass-card p-6">
                    <p className="text-muted-foreground">Unable to load student profile.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-between"
                >
                    <h1 className="text-4xl font-bold neon-text">My Profile</h1>
                    <Button variant="outline" className="glass hover:neon-glow" onClick={() => navigate("/student")}>
                        Back to Dashboard
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-1"
                    >
                        <Card className="glass-card p-6 flex flex-col items-center text-center h-full">
                            <div className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center mb-4 border-2 border-primary/50 relative overflow-hidden">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground" />
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{profile.name || "Student"}</h2>
                            <p className="text-muted-foreground">{studentData.roll_number || profile.id}</p>
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {studentData.grade_name && (
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
                                        {studentData.grade_name}
                                    </span>
                                )}
                                {studentData.class_name && (
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
                                        {studentData.class_name}
                                    </span>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Details Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-2"
                    >
                        <Card className="glass-card p-6 h-full">
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" /> Personal Information
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                    <Mail className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{userEmail || "Not available"}</p>
                                    </div>
                                </div>
                                {studentData.class_name && (
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Class</p>
                                            <p className="font-medium">{studentData.class_name}</p>
                                        </div>
                                    </div>
                                )}
                                {studentData.grade_name && (
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                        <Award className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Grade Level</p>
                                            <p className="font-medium">{studentData.grade_name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Stats & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="glass-card p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-neon-purple/20 text-neon-purple">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Student ID</p>
                                    <p className="text-2xl font-bold">{studentData.roll_number || profile.id.slice(0, 8)}</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="glass-card p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-neon-cyan/20 text-neon-cyan">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Member Since</p>
                                    <p className="text-lg font-bold">
                                        {new Date(profile.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className={`glass-card p-6 border-l-4 ${isFeedbackActive ? 'border-l-neon-pink' : 'border-l-muted'}`}>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Star className={`w-5 h-5 ${isFeedbackActive ? 'text-neon-pink fill-neon-pink' : 'text-muted'}`} />
                                        Annual Feedback
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {isFeedbackActive
                                            ? "The annual feedback survey is now open. Please share your thoughts."
                                            : "Feedback survey is currently closed."}
                                    </p>
                                </div>
                                <Button
                                    className={`mt-4 w-full ${isFeedbackActive ? 'bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30' : ''}`}
                                    disabled={!isFeedbackActive}
                                    onClick={() => navigate("/student/feedback")}
                                >
                                    {isFeedbackActive ? "Give Feedback" : "Closed"}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
