import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, Users, School, Save, Plus, Trash2, Key, CheckCircle, Calendar, Mail, UserPlus, Ban, Loader2, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/auth/AuthContext";

export default function AdminPanel() {
    const { profile, logout } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data State
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [fileCategories, setFileCategories] = useState<any[]>([]);
    
    // Form States
    const [newClass, setNewClass] = useState("");
    const [newGrade, setNewGrade] = useState("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedTeacher, setSelectedTeacher] = useState<string>("");
    
    // Student-Class Assignment
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [selectedClassForStudent, setSelectedClassForStudent] = useState<string>("");
    
    // Subject-Grade Assignment
    const [selectedGradeForSubject, setSelectedGradeForSubject] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [gradeSubjects, setGradeSubjects] = useState<any[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [newFileCategory, setNewFileCategory] = useState("");

    // Member Creation
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberPassword, setNewMemberPassword] = useState("");
    const [newMemberType, setNewMemberType] = useState<"teacher" | "student">("teacher");
    const [isCreatingMember, setIsCreatingMember] = useState(false);

    useEffect(() => {
        if (profile?.school_id) {
            fetchSchoolData();
        }
    }, [profile?.school_id]);

    const fetchSchoolData = async () => {
        setLoading(true);
        try {
            // Parallel fetching
            const [teachersRes, studentsRes, classesRes, subjectsRes, gradesRes, gradeSubjectsRes, fileCategoriesRes] = await Promise.all([
                supabase.from('profiles').select('*, classes(name)').eq('school_id', profile?.school_id).eq('role_id', 3), // Teacher
                supabase.from('profiles').select('*, classes(name)').eq('school_id', profile?.school_id).eq('role_id', 4), // Student
                supabase.from('classes').select('*, grade_levels(name)').eq('school_id', profile?.school_id),
                supabase.from('subjects_master').select('*'),
                supabase.from('grade_levels').select('*').eq('school_id', profile?.school_id),
                supabase.from('grade_subjects').select('*, grade_levels!inner(id, name, school_id), subjects_master(name)').eq('grade_levels.school_id', profile?.school_id),
                supabase.from('file_categories').select('*').eq('school_id', profile?.school_id)
            ]);

            if (teachersRes.error) throw teachersRes.error;
            if (studentsRes.error) throw studentsRes.error;
            if (classesRes.error) throw classesRes.error;
            if (gradesRes.error) throw gradesRes.error;
            
            setTeachers(teachersRes.data || []);
            setStudents(studentsRes.data || []);
            setClasses(classesRes.data || []);
            setGrades(gradesRes.data || []);
            if (subjectsRes.data) setSubjects(subjectsRes.data);
            if (gradeSubjectsRes.data) setGradeSubjects(gradeSubjectsRes.data);
            if (fileCategoriesRes.data) setFileCategories(fileCategoriesRes.data);

        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load school data");
        } finally {
            setLoading(false);
        }
    };

    const addGrade = async () => {
        if (!newGrade) return;
        try {
            const { error } = await supabase.from('grade_levels').insert({
                name: newGrade,
                school_id: profile?.school_id
            });
            
            if (error) throw error;
            toast.success("Grade Level added");
            setNewGrade("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addClass = async () => {
        if (!newClass || !selectedGrade) {
            toast.error("Please enter class name and select a grade");
            return;
        }
        try {
            const { error } = await supabase.from('classes').insert({
                name: newClass,
                school_id: profile?.school_id,
                grade_level_id: parseInt(selectedGrade)
            });
            
            if (error) throw error;
            toast.success("Class added");
            setNewClass("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const assignTeacher = async () => {
        if (!selectedTeacher || !selectedClass) {
             toast.error("Select both teacher and class");
             return;
        }
        try {
            const { error } = await supabase.from('teacher_classes').insert({
                teacher_id: selectedTeacher,
                class_id: selectedClass,
                school_id: profile?.school_id
            });
            if (error) throw error;
            toast.success("Teacher assigned to class");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const assignStudentToClass = async () => {
        if (!selectedStudent || !selectedClassForStudent) {
            toast.error("Select both student and class");
            return;
        }
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ class_id: selectedClassForStudent })
                .eq('id', selectedStudent);
            
            if (error) throw error;
            toast.success("Student assigned to class");
            setSelectedStudent("");
            setSelectedClassForStudent("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addSubjectToGrade = async () => {
        if (!selectedGradeForSubject || !selectedSubject) {
            toast.error("Select both grade and subject");
            return;
        }
        try {
            const { error } = await supabase.from('grade_subjects').insert({
                grade_level_id: parseInt(selectedGradeForSubject),
                subject_master_id: selectedSubject
            });
            
            if (error) throw error;
            toast.success("Subject added to grade");
            setSelectedSubject("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addSubject = async () => {
        if (!newSubject.trim()) {
            toast.error("Please enter a subject name");
            return;
        }
        try {
            const { error } = await supabase.from('subjects_master').insert({
                name: newSubject.trim()
            });
            
            if (error) throw error;
            toast.success("Subject created");
            setNewSubject("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addFileCategory = async () => {
        if (!newFileCategory.trim()) {
            toast.error("Please enter a category name");
            return;
        }
        try {
            const { error } = await supabase.from('file_categories').insert({
                name: newFileCategory.trim(),
                school_id: profile?.school_id
            });
            
            if (error) throw error;
            toast.success("File category created");
            setNewFileCategory("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleCreateMember = async () => {
        if (!newMemberName || !newMemberEmail || !newMemberPassword) {
            toast.error("Please fill all fields");
            return;
        }

        setIsCreatingMember(true);
        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newMemberEmail,
                    password: newMemberPassword,
                    name: newMemberName,
                    role: newMemberType,
                    school_id: profile?.school_id
                }
            });

            if (error) throw error;

            toast.success(`${newMemberType} created successfully!`);
            setNewMemberName("");
            setNewMemberEmail("");
            setNewMemberPassword("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create user");
        } finally {
            setIsCreatingMember(false);
        }
    };

    const deleteMember = async (id: string) => {
        if (!confirm("Are you sure you want to delete this member? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            toast.success("Member deleted successfully");
            fetchSchoolData();
        } catch (error: any) {
            console.error("Error deleting member:", error);
            toast.error("Failed to delete member");
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-4xl font-bold neon-text mb-2">School Admin Panel 🛡️</h1>
                        <p className="text-muted-foreground">{profile?.name} - {profile?.school_id}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => logout()}>
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </motion.div>

                <Tabs defaultValue="structure" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 glass p-1 h-auto">
                        <TabsTrigger value="structure">Structure</TabsTrigger>
                        <TabsTrigger value="members">Members 👥</TabsTrigger>
                        {/* Simplified for migration first pass */}
                    </TabsList>

                    {/* Structure Tab */}
                    <TabsContent value="structure">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Grade Levels */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-neon-cyan" /> Grades
                                </h2>
                                <div className="flex gap-2 mb-6">
                                    <Input
                                        placeholder="e.g. Grade 10"
                                        value={newGrade}
                                        onChange={(e) => setNewGrade(e.target.value)}
                                        className="glass"
                                    />
                                    <Button onClick={addGrade}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {grades.map((g) => (
                                        <Badge key={g.id} variant="outline" className="px-3 py-1 text-sm">
                                            {g.name}
                                        </Badge>
                                    ))}
                                </div>
                            </Card>

                            {/* Classes */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <School className="w-5 h-5 text-neon-cyan" /> Classes
                                </h2>
                                <div className="space-y-4 mb-6">
                                    <select 
                                        className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                        value={selectedGrade}
                                        onChange={(e) => setSelectedGrade(e.target.value)}
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map((g) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. 10-A"
                                            value={newClass}
                                            onChange={(e) => setNewClass(e.target.value)}
                                            className="glass"
                                        />
                                        <Button onClick={addClass}><Plus className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                                    {classes.map((cls) => (
                                        <Badge key={cls.id} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                                            {cls.name} <span className="text-xs opacity-50">({cls.grade_levels?.name})</span>
                                        </Badge>
                                    ))}
                                </div>
                            </Card>

                            {/* Teacher Assignment */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-neon-cyan" /> Assign Teachers
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Teacher</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedTeacher}
                                            onChange={(e) => setSelectedTeacher(e.target.value)}
                                        >
                                            <option value="">Select Teacher</option>
                                            {teachers.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Class</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button onClick={assignTeacher} className="w-full neon-glow">
                                        Assign Teacher to Class
                                    </Button>
                                </div>
                            </Card>

                            {/* Student Assignment */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-neon-cyan" /> Assign Students
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Student</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedStudent}
                                            onChange={(e) => setSelectedStudent(e.target.value)}
                                        >
                                            <option value="">Select Student</option>
                                            {students.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name} {s.classes?.name ? `(${s.classes.name})` : '(Unassigned)'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Class</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedClassForStudent}
                                            onChange={(e) => setSelectedClassForStudent(e.target.value)}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button onClick={assignStudentToClass} className="w-full neon-glow">
                                        Assign Student to Class
                                    </Button>
                                </div>
                            </Card>

                            {/* Subjects Management */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-neon-cyan" /> Subjects
                                </h2>
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        placeholder="e.g. Mathematics"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        className="glass"
                                    />
                                    <Button onClick={addSubject}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                                    {subjects.map((s) => (
                                        <Badge key={s.id} variant="outline" className="px-3 py-1 text-sm">
                                            {s.name}
                                        </Badge>
                                    ))}
                                </div>
                            </Card>

                            {/* Subject-Grade Assignment */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-neon-cyan" /> Grade Subjects
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Grade</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedGradeForSubject}
                                            onChange={(e) => setSelectedGradeForSubject(e.target.value)}
                                        >
                                            <option value="">Select Grade</option>
                                            {grades.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Subject</label>
                                        <select 
                                            className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                            value={selectedSubject}
                                            onChange={(e) => setSelectedSubject(e.target.value)}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button onClick={addSubjectToGrade} className="w-full neon-glow">
                                        Add Subject to Grade
                                    </Button>
                                </div>
                                
                                {/* Display existing grade-subject mappings */}
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-sm text-muted-foreground mb-2">Current Mappings:</p>
                                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                                        {gradeSubjects.map((gs) => (
                                            <Badge key={gs.id} variant="outline" className="px-2 py-1 text-xs">
                                                {gs.grade_levels?.name}: {gs.subjects_master?.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Add New Member */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-neon-cyan" /> Add New Member
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 p-1 bg-secondary/20 rounded-lg">
                                        <Button
                                            variant={newMemberType === "teacher" ? "default" : "ghost"}
                                            onClick={() => setNewMemberType("teacher")}
                                            className={`flex-1 ${newMemberType === "teacher" ? "neon-glow" : ""}`}
                                        >
                                            Teacher
                                        </Button>
                                        <Button
                                            variant={newMemberType === "student" ? "default" : "ghost"}
                                            onClick={() => setNewMemberType("student")}
                                            className={`flex-1 ${newMemberType === "student" ? "neon-glow" : ""}`}
                                        >
                                            Student
                                        </Button>
                                    </div>
                                    <Input
                                        placeholder={`Name`}
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        className="glass"
                                    />
                                    <Input
                                        placeholder={`Email`}
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        className="glass"
                                    />
                                    <Input
                                        placeholder={`Password`}
                                        type="password"
                                        value={newMemberPassword}
                                        onChange={(e) => setNewMemberPassword(e.target.value)}
                                        className="glass"
                                    />
                                    <Button 
                                        className="w-full neon-glow" 
                                        onClick={handleCreateMember}
                                        disabled={isCreatingMember}
                                    >
                                        {isCreatingMember ? <Loader2 className="animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2" />}
                                        Create {newMemberType === "teacher" ? "Teacher" : "Student"}
                                    </Button>
                                </div>
                            </Card>

                            {/* List Members */}
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-400" /> Existing Members
                                </h2>
                                <Tabs defaultValue="teachers">
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
                                        <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="teachers" className="max-h-[300px] overflow-y-auto">
                                        {teachers.map(t => (
                                            <div key={t.id} className="p-2 border-b border-white/10 flex justify-between items-center">
                                                <div>{t.name} <span className="text-xs text-muted-foreground">({t.email})</span></div>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => deleteMember(t.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="students" className="max-h-[300px] overflow-y-auto">
                                        {students.map(s => (
                                            <div key={s.id} className="p-2 border-b border-white/10 flex justify-between items-center">
                                                <div>{s.name} <span className="text-xs text-muted-foreground">({s.email})</span></div>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => deleteMember(s.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
