import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Briefcase, BookOpen, Users, Loader2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/supabase/client";

const TeacherProfile = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);

    useEffect(() => {
        if (profile?.id) {
            fetchTeacherData();
        }
    }, [profile?.id]);

    const fetchTeacherData = async () => {
        setLoading(true);
        try {
            // Fetch assigned classes via teacher_classes
            const { data: classesData, error: classesError } = await supabase
                .from('teacher_classes')
                .select('classes(id, name, grade_levels(name))')
                .eq('teacher_id', profile?.id);

            if (classesError) throw classesError;

            const classes = classesData?.map((tc: any) => tc.classes) || [];
            setAssignedClasses(classes);

            // Get unique grade_level_ids from assigned classes
            const gradeLevelIds = [...new Set(classes.map((c: any) => c?.grade_levels?.id).filter(Boolean))];

            if (gradeLevelIds.length > 0) {
                // Fetch subjects for those grade levels
                const { data: gradeSubjectsData, error: subjectsError } = await supabase
                    .from('grade_subjects')
                    .select('subjects_master(name)')
                    .in('grade_level_id', gradeLevelIds);

                if (!subjectsError && gradeSubjectsData) {
                    const subjectNames = [...new Set(gradeSubjectsData.map((gs: any) => gs.subjects_master?.name).filter(Boolean))];
                    setSubjects(subjectNames);
                }
            }
        } catch (error) {
            console.error("Error fetching teacher data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                    <Button variant="outline" className="glass hover:neon-glow" onClick={() => navigate("/teacher")}>
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
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground" />
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{profile?.name || "Teacher"}</h2>
                            <p className="text-muted-foreground text-sm">{profile?.email}</p>
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
                                    Teacher
                                </span>
                                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm border border-accent/20">
                                    {assignedClasses.length} Classes
                                </span>
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
                                <User className="w-5 h-5 text-primary" /> Profile Information
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                    <Mail className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{profile?.email || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Joined</p>
                                        <p className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Role</p>
                                        <p className="font-medium">{profile?.role || "Teacher"}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Stats & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="glass-card p-6 h-full">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-500" /> Subjects Taught
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {subjects.length > 0 ? subjects.map((subject) => (
                                    <span key={subject} className="px-3 py-1 rounded-md bg-secondary/50 border border-white/10">
                                        {subject}
                                    </span>
                                )) : (
                                    <p className="text-muted-foreground text-sm">No subjects assigned yet</p>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="glass-card p-6 h-full">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-neon-purple" /> Assigned Classes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {assignedClasses.length > 0 ? assignedClasses.map((cls) => (
                                    <span key={cls?.id} className="px-3 py-1 rounded-md bg-secondary/50 border border-white/10">
                                        {cls?.name} {cls?.grade_levels?.name && `(${cls.grade_levels.name})`}
                                    </span>
                                )) : (
                                    <p className="text-muted-foreground text-sm">No classes assigned yet</p>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfile;
