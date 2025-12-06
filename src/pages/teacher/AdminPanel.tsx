import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, Users, School, Save, Plus, Trash2, Key, CheckCircle, Calendar, Mail, UserPlus, Ban, Loader2, LogOut, Edit, FileText, Folder, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/supabase/client";
import { useAuth } from "@/auth/AuthContext";
import { getTimetableForClass, getOrCreateTimetableDay, saveTimetablePeriod, deleteTimetablePeriod, DAY_NAMES, WeeklyTimetable } from "@/services/timetableService";

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
    const [examTypes, setExamTypes] = useState<any[]>([]);
    
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
    const [newExamType, setNewExamType] = useState("");

    // Search filters
    const [teacherSearch, setTeacherSearch] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [teacherClassFilter, setTeacherClassFilter] = useState<string>("all");
    const [studentClassFilter, setStudentClassFilter] = useState<string>("all");

    // Member Creation
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberPassword, setNewMemberPassword] = useState("");
    const [newMemberType, setNewMemberType] = useState<"teacher" | "student">("teacher");
    const [isCreatingMember, setIsCreatingMember] = useState(false);

    // Edit states
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});

    // Timetable states
    const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>("");
    const [selectedTimetableDay, setSelectedTimetableDay] = useState<number>(1); // 1=Monday, 2=Tuesday, etc.
    const [timetableData, setTimetableData] = useState<WeeklyTimetable>({});
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [periodForm, setPeriodForm] = useState<{
        id?: string;
        period_number: number;
        subject_id: string;
        teacher_id: string;
        start_time: string;
        end_time: string;
        room: string;
    }>({
        period_number: 1,
        subject_id: "",
        teacher_id: "",
        start_time: "09:00",
        end_time: "10:30",
        room: "",
    });
    const [isEditingPeriod, setIsEditingPeriod] = useState(false);

    useEffect(() => {
        if (profile?.school_id) {
            fetchSchoolData();
        }
    }, [profile?.school_id]);

    const fetchSchoolData = async () => {
        setLoading(true);
        try {
            // Parallel fetching
            const [teachersRes, studentsRes, classesRes, teacherClassesRes, subjectsRes, gradesRes, gradeSubjectsRes, fileCategoriesRes, examTypesRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('school_id', profile?.school_id).eq('role_id', 3), // Teacher
                supabase.from('profiles').select('*, classes(id, name)').eq('school_id', profile?.school_id).eq('role_id', 4), // Student
                supabase.from('classes').select('*, grade_levels(name)').eq('school_id', profile?.school_id),
                supabase.from('teacher_classes').select('*, classes(*)').eq('school_id', profile?.school_id),
                supabase.from('subjects_master').select('*'),
                supabase.from('grade_levels').select('*').eq('school_id', profile?.school_id),
                supabase.from('grade_subjects').select('*, grade_levels!inner(id, name, school_id), subjects_master(name)').eq('grade_levels.school_id', profile?.school_id),
                supabase.from('file_categories').select('*').eq('school_id', profile?.school_id),
                supabase.from('exam_types').select('*').eq('school_id', profile?.school_id)
            ]);

            if (teachersRes.error) throw teachersRes.error;
            if (studentsRes.error) throw studentsRes.error;
            if (classesRes.error) throw classesRes.error;
            if (teacherClassesRes.error) throw teacherClassesRes.error;
            if (gradesRes.error) throw gradesRes.error;
            if (fileCategoriesRes.error) throw fileCategoriesRes.error;
            if (examTypesRes.error) throw examTypesRes.error;
            
            console.log("File Categories Response:", fileCategoriesRes);
            console.log("Teachers data:", teachersRes.data);
            console.log("Students data:", studentsRes.data);
            console.log("Teacher classes data:", teacherClassesRes.data);
            
            // Attach class information to teachers
            const teachersWithClasses = (teachersRes.data || []).map(teacher => {
                const teacherClass = (teacherClassesRes.data || []).find(tc => tc.teacher_id === teacher.id);
                return {
                    ...teacher,
                    classes: teacherClass?.classes || null
                };
            });
            
            setTeachers(teachersWithClasses);
            setStudents(studentsRes.data || []);
            setClasses(classesRes.data || []);
            setGrades(gradesRes.data || []);
            if (subjectsRes.data) setSubjects(subjectsRes.data);
            if (gradeSubjectsRes.data) setGradeSubjects(gradeSubjectsRes.data);
            if (fileCategoriesRes.data) setFileCategories(fileCategoriesRes.data);
            if (examTypesRes.data) setExamTypes(examTypesRes.data);

        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load school data");
        } finally {
            setLoading(false);
        }
    };

    const addGrade = async () => {
        if (!newGrade.trim()) {
            toast.error("Please enter grade name");
            return;
        }
        try {
            const { error } = await supabase.from('grade_levels').insert({
                name: newGrade.trim(),
                school_id: profile?.school_id
            });
            if (error) throw error;
            toast.success("Grade created");
            setNewGrade("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const addClass = async () => {
        if (!newClass || !selectedGrade) {
            toast.error("Please enter class name and select grade");
            return;
        }
        try {
            const { error } = await supabase.from('classes').insert({
                name: newClass,
                school_id: profile?.school_id,
                grade_level_id: parseInt(selectedGrade)
            });
            if (error) throw error;
            toast.success("Class created");
            setNewClass("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const assignTeacher = async () => {
        if (!selectedTeacher || !selectedClass) {
            toast.error("Please select both teacher and class");
            return;
        }
        
        // Check if teacher is already assigned to this class
        console.log("Checking assignment for teacher:", selectedTeacher, "class:", selectedClass, "school:", profile?.school_id);
        
        const { data: existingAssignment, error: checkError } = await supabase
            .from('teacher_classes')
            .select('*')
            .eq('teacher_id', selectedTeacher)
            .eq('class_id', selectedClass)
            .eq('school_id', profile?.school_id);
            
        console.log("Assignment check result:", { data: existingAssignment, error: checkError });
            
        if (checkError) {
            console.error("Check error:", checkError);
            if (checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
                toast.error("Error checking assignment");
                return;
            }
        }
        
        if (existingAssignment && existingAssignment.length > 0) {
            console.log("Found existing assignment:", existingAssignment);
            toast.error("Teacher is already assigned to this class");
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
            setSelectedTeacher("");
            setSelectedClass("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const assignStudentToClass = async () => {
        if (!selectedStudent || !selectedClassForStudent) {
            toast.error("Select both student and class");
            return;
        }
        
        // Check if student is already assigned to this class
        const { data: currentStudent, error: checkError } = await supabase
            .from('profiles')
            .select('class_id, classes(id, name)')
            .eq('id', selectedStudent)
            .single();
            
        if (checkError) {
            toast.error("Error checking student assignment");
            return;
        }
        
        if (currentStudent.class_id === selectedClassForStudent) {
            toast.error("Student is already assigned to this class");
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

    const addExamType = async () => {
        if (!newExamType.trim()) {
            toast.error("Please enter an exam type name");
            return;
        }
        try {
            const { error } = await supabase.from('exam_types').insert({
                name: newExamType.trim(),
                school_id: profile?.school_id
            });
            
            if (error) throw error;
            toast.success("Exam type created");
            setNewExamType("");
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
            
            toast.success(`${newMemberType === 'teacher' ? 'Teacher' : 'Student'} created successfully`);
            setNewMemberName("");
            setNewMemberEmail("");
            setNewMemberPassword("");
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
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

    const deleteItem = async (table: string, id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            toast.success(`${name} deleted successfully`);
            fetchSchoolData();
        } catch (error: any) {
            toast.error(`Failed to delete ${name}`);
        }
    };

    const startEdit = (item: any, type: string) => {
        setEditingItem({ ...item, type });
        setEditForm(item);
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditForm({});
    };

    const saveEdit = async () => {
        if (!editingItem) return;

        try {
            const { error } = await supabase
                .from(editingItem.type)
                .update({ name: editForm.name })
                .eq('id', editingItem.id);

            if (error) throw error;
            
            toast.success("Updated successfully");
            cancelEdit();
            fetchSchoolData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Timetable Functions
    const fetchTimetable = async (classId: string) => {
        if (!classId || !profile?.school_id) return;
        setTimetableLoading(true);
        try {
            const data = await getTimetableForClass(classId, profile.school_id);
            setTimetableData(data);
        } catch (error) {
            console.error("Error fetching timetable:", error);
            toast.error("Failed to load timetable");
        } finally {
            setTimetableLoading(false);
        }
    };

    const handleAddPeriod = async () => {
        if (!selectedTimetableClass || !profile?.school_id) {
            toast.error("Please select a class first");
            return;
        }
        if (!periodForm.subject_id || !periodForm.teacher_id) {
            toast.error("Please fill all required fields");
            return;
        }

        try {
            // Get or create the day entry
            const day = await getOrCreateTimetableDay(
                selectedTimetableClass,
                selectedTimetableDay,
                profile.school_id
            );

            if (!day) {
                toast.error("Failed to create timetable day");
                return;
            }

            // Save the period
            const result = await saveTimetablePeriod({
                id: periodForm.id,
                timetable_day_id: day.id,
                period_number: periodForm.period_number,
                subject_id: periodForm.subject_id,
                teacher_id: periodForm.teacher_id,
                start_time: periodForm.start_time,
                end_time: periodForm.end_time,
                room: periodForm.room,
                school_id: profile.school_id,
            });

            if (result) {
                toast.success(isEditingPeriod ? "Period updated" : "Period added");
                resetPeriodForm();
                fetchTimetable(selectedTimetableClass);
            } else {
                toast.error("Failed to save period");
            }
        } catch (error) {
            console.error("Error saving period:", error);
            toast.error("Failed to save period");
        }
    };

    const handleEditPeriod = (period: any) => {
        setPeriodForm({
            id: period.id,
            period_number: period.period_number,
            subject_id: period.subject_id,
            teacher_id: period.teacher_id,
            start_time: period.start_time,
            end_time: period.end_time,
            room: period.room || "",
        });
        setIsEditingPeriod(true);
    };

    const handleDeletePeriod = async (periodId: string) => {
        if (!confirm("Are you sure you want to delete this period?")) return;

        const success = await deleteTimetablePeriod(periodId);
        if (success) {
            toast.success("Period deleted");
            fetchTimetable(selectedTimetableClass);
        } else {
            toast.error("Failed to delete period");
        }
    };

    const resetPeriodForm = () => {
        setPeriodForm({
            period_number: 1,
            subject_id: "",
            teacher_id: "",
            start_time: "09:00",
            end_time: "10:30",
            room: "",
        });
        setIsEditingPeriod(false);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    console.log("Current fileCategories state:", fileCategories);

    // Filter teachers and students based on search and class
    const filteredTeachers = teachers.filter(teacher => {
        const matchesSearch = teacher.name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                              teacher.email?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                              teacher.classes?.name?.toLowerCase().includes(teacherSearch.toLowerCase());
        
        const matchesClass = teacherClassFilter === "all" || 
                            teacher.classes?.id === teacherClassFilter ||
                            (teacherClassFilter === "unassigned" && !teacher.classes?.id);
        
        console.log("Teacher filter check:", {
            teacher: teacher.name,
            classId: teacher.classes?.id,
            filter: teacherClassFilter,
            matchesSearch,
            matchesClass
        });
        
        return matchesSearch && matchesClass;
    });

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              student.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              student.classes?.name?.toLowerCase().includes(studentSearch.toLowerCase());
        
        const matchesClass = studentClassFilter === "all" || 
                            student.classes?.id === studentClassFilter ||
                            (studentClassFilter === "unassigned" && !student.classes?.id);
        
        console.log("Student filter check:", {
            student: student.name,
            classId: student.classes?.id,
            filter: studentClassFilter,
            matchesSearch,
            matchesClass
        });
        
        return matchesSearch && matchesClass;
    });

    // Get subjects for the selected timetable class's grade
    // Note: subject_id in timetable_periods references grade_subjects.id, not subjects_master.id
    const selectedClassData = classes.find(c => c.id === selectedTimetableClass);
    const filteredSubjectsForClass = selectedClassData 
        ? gradeSubjects
            .filter(gs => gs.grade_level_id === selectedClassData.grade_level_id)
            .map(gs => ({ id: gs.id, name: gs.subjects_master?.name })) // Use gs.id (grade_subjects.id)
            .filter(s => s.name) // Filter out any with missing names
        : subjects; // Fallback to all subjects if no class selected

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

                <Tabs defaultValue="grades" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 glass p-1 h-auto">
                        <TabsTrigger value="grades">Grades</TabsTrigger>
                        <TabsTrigger value="classes">Classes</TabsTrigger>
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="assignments">Assignments</TabsTrigger>
                        <TabsTrigger value="examtypes">Exam Types</TabsTrigger>
                        <TabsTrigger value="files">File Categories</TabsTrigger>
                        <TabsTrigger value="timetable">Timetable</TabsTrigger>
                    </TabsList>

                    {/* Grades Tab */}
                    <TabsContent value="grades">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <School className="w-6 h-6 text-primary" /> Grade Levels
                                </h2>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g. Grade 10"
                                        value={newGrade}
                                        onChange={(e) => setNewGrade(e.target.value)}
                                        className="w-48"
                                    />
                                    <Button onClick={addGrade}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Grade
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-2">Grade Name</th>
                                            <th className="text-left p-2">Created</th>
                                            <th className="text-right p-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map((grade) => (
                                            <tr key={grade.id} className="border-b border-border/50 hover:bg-secondary/20">
                                                <td className="p-2">
                                                    {editingItem?.id === grade.id ? (
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        grade.name
                                                    )}
                                                </td>
                                                <td className="p-2 text-muted-foreground">
                                                    {new Date(grade.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {editingItem?.id === grade.id ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" onClick={saveEdit}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" onClick={() => startEdit(grade, 'grade_levels')}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => deleteItem('grade_levels', grade.id, 'grade')}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Classes Tab */}
                    <TabsContent value="classes">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <School className="w-6 h-6 text-primary" /> Classes
                                </h2>
                                <div className="flex gap-2">
                                    <select 
                                        className="bg-background/50 border border-input rounded-md h-10 px-3"
                                        value={selectedGrade}
                                        onChange={(e) => setSelectedGrade(e.target.value)}
                                    >
                                        <option value="">Select Grade</option>
                                        {grades.map((g) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <Input
                                        placeholder="e.g. 10-A"
                                        value={newClass}
                                        onChange={(e) => setNewClass(e.target.value)}
                                        className="w-48"
                                    />
                                    <Button onClick={addClass}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Class
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-2">Class Name</th>
                                            <th className="text-left p-2">Grade</th>
                                            <th className="text-left p-2">Created</th>
                                            <th className="text-right p-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((cls) => (
                                            <tr key={cls.id} className="border-b border-border/50 hover:bg-secondary/20">
                                                <td className="p-2">{cls.name}</td>
                                                <td className="p-2">{cls.grade_levels?.name}</td>
                                                <td className="p-2 text-muted-foreground">
                                                    {new Date(cls.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <Button size="sm" variant="destructive" onClick={() => deleteItem('classes', cls.id, 'class')}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Subjects Tab */}
                    <TabsContent value="subjects">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" /> Master Subjects
                                </h2>
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        placeholder="e.g. Mathematics"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                    />
                                    <Button onClick={addSubject}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {subjects.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                                            <span>{s.name}</span>
                                            <Button size="sm" variant="destructive" onClick={() => deleteItem('subjects_master', s.id, 'subject')}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" /> Grade Subjects
                                </h2>
                                <div className="space-y-4 mb-4">
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
                                    <Button onClick={addSubjectToGrade} className="w-full">
                                        Add Subject to Grade
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {gradeSubjects.map((gs) => (
                                        <div key={gs.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                                            <span>{gs.grade_levels?.name}: {gs.subjects_master?.name}</span>
                                            <Button size="sm" variant="destructive" onClick={() => deleteItem('grade_subjects', gs.id, 'mapping')}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" /> Add New Member
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex gap-2 p-1 bg-secondary/20 rounded-lg">
                                        <Button
                                            variant={newMemberType === "teacher" ? "default" : "ghost"}
                                            onClick={() => setNewMemberType("teacher")}
                                            className="flex-1"
                                        >
                                            Teacher
                                        </Button>
                                        <Button
                                            variant={newMemberType === "student" ? "default" : "ghost"}
                                            onClick={() => setNewMemberType("student")}
                                            className="flex-1"
                                        >
                                            Student
                                        </Button>
                                    </div>
                                    <Input placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                                    <Input placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                                    <Input placeholder="Password" type="password" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} />
                                    <Button 
                                        className="w-full" 
                                        onClick={handleCreateMember}
                                        disabled={isCreatingMember}
                                    >
                                        {isCreatingMember ? <Loader2 className="animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2" />}
                                        Create {newMemberType === "teacher" ? "Teacher" : "Student"}
                                    </Button>
                                </div>
                            </Card>

                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" /> Members List
                                </h2>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    <div>
                                        <h3 className="font-medium mb-2">Teachers</h3>
                                        <div className="flex gap-2 mb-3">
                                            <Input
                                                placeholder="Search teachers by name, email, or class..."
                                                value={teacherSearch}
                                                onChange={(e) => setTeacherSearch(e.target.value)}
                                                className="flex-1"
                                            />
                                            <select
                                                value={teacherClassFilter}
                                                onChange={(e) => setTeacherClassFilter(e.target.value)}
                                                className="bg-background/50 border border-input rounded-md h-10 px-3 min-w-40"
                                            >
                                                <option value="all">All Classes</option>
                                                <option value="unassigned">Unassigned</option>
                                                {classes.map((cls) => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {filteredTeachers.map((t) => (
                                            <div key={t.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                                                <div>
                                                    <p className="font-medium">{t.name}</p>
                                                    <p className="text-sm text-muted-foreground">{t.email}</p>
                                                </div>
                                                <Button size="sm" variant="destructive" onClick={() => deleteMember(t.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {filteredTeachers.length === 0 && (teacherSearch || teacherClassFilter !== "all") && (
                                            <p className="text-sm text-muted-foreground text-center py-2">
                                                No teachers found matching your filters
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-2">Students</h3>
                                        <div className="flex gap-2 mb-3">
                                            <Input
                                                placeholder="Search students by name, email, or class..."
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                className="flex-1"
                                            />
                                            <select
                                                value={studentClassFilter}
                                                onChange={(e) => setStudentClassFilter(e.target.value)}
                                                className="bg-background/50 border border-input rounded-md h-10 px-3 min-w-40"
                                            >
                                                <option value="all">All Classes</option>
                                                <option value="unassigned">Unassigned</option>
                                                {classes.map((cls) => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {filteredStudents.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                                                <div>
                                                    <p className="font-medium">{s.name}</p>
                                                    <p className="text-sm text-muted-foreground">{s.email}</p>
                                                    <p className="text-xs">{s.classes?.name || 'Unassigned'}</p>
                                                </div>
                                                <Button size="sm" variant="destructive" onClick={() => deleteMember(s.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {filteredStudents.length === 0 && (studentSearch || studentClassFilter !== "all") && (
                                            <p className="text-sm text-muted-foreground text-center py-2">
                                                No students found matching your filters
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Assignments Tab */}
                    <TabsContent value="assignments">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" /> Assign Students to Classes
                                </h2>
                                <div className="space-y-4">
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
                                    <Button onClick={assignStudentToClass} className="w-full">
                                        Assign Student to Class
                                    </Button>
                                </div>
                            </Card>

                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" /> Assign Teachers to Classes
                                </h2>
                                <div className="space-y-4">
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
                                    <Button onClick={assignTeacher} className="w-full">
                                        Assign Teacher to Class
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Exam Types Tab */}
                    <TabsContent value="examtypes">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-primary" /> Exam Types
                                </h2>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g. Mid-Term Exam"
                                        value={newExamType}
                                        onChange={(e) => setNewExamType(e.target.value)}
                                        className="w-48"
                                    />
                                    <Button onClick={addExamType}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Exam Type
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-2">Exam Type Name</th>
                                            <th className="text-left p-2">Created</th>
                                            <th className="text-right p-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examTypes.map((examType) => (
                                            <tr key={examType.id} className="border-b border-border/50 hover:bg-secondary/20">
                                                <td className="p-2">
                                                    {editingItem?.id === examType.id ? (
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        examType.name
                                                    )}
                                                </td>
                                                <td className="p-2 text-muted-foreground">
                                                    {new Date(examType.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {editingItem?.id === examType.id ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" onClick={saveEdit}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" onClick={() => startEdit(examType, 'exam_types')}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => deleteItem('exam_types', examType.id, 'exam type')}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {examTypes.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No exam types created yet</p>
                                        <p className="text-sm">Use the form above to add your first exam type</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabsContent>

                    {/* File Categories Tab */}
                    <TabsContent value="files">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <Folder className="w-6 h-6 text-primary" /> File Categories
                                </h2>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g. Assignments"
                                        value={newFileCategory}
                                        onChange={(e) => setNewFileCategory(e.target.value)}
                                        className="w-48"
                                    />
                                    <Button onClick={addFileCategory}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Category
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-2">Category Name</th>
                                            <th className="text-left p-2">Created</th>
                                            <th className="text-right p-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fileCategories.map((category) => (
                                            <tr key={category.id} className="border-b border-border/50 hover:bg-secondary/20">
                                                <td className="p-2">
                                                    {editingItem?.id === category.id ? (
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            className="w-full"
                                                        />
                                                    ) : (
                                                        category.name
                                                    )}
                                                </td>
                                                <td className="p-2 text-muted-foreground">
                                                    {new Date(category.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {editingItem?.id === category.id ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" onClick={saveEdit}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" onClick={() => startEdit(category, 'file_categories')}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => deleteItem('file_categories', category.id, 'category')}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {fileCategories.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No file categories created yet</p>
                                        <p className="text-sm">Use the form above to add your first category</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Timetable Tab */}
                    <TabsContent value="timetable">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-primary" /> Class Timetable
                                </h2>
                                <div className="flex gap-2">
                                    <select
                                        className="bg-background/50 border border-input rounded-md h-10 px-3"
                                        value={selectedTimetableClass}
                                        onChange={(e) => {
                                            setSelectedTimetableClass(e.target.value);
                                            if (e.target.value) fetchTimetable(e.target.value);
                                        }}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.grade_levels?.name})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {!selectedTimetableClass ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Select a class to manage its timetable</p>
                                </div>
                            ) : timetableLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Day Tabs */}
                                    <div className="flex gap-2 flex-wrap">
                                        {DAY_NAMES.map((day, index) => (
                                            <Button
                                                key={day}
                                                variant={selectedTimetableDay === index + 1 ? "default" : "outline"}
                                                onClick={() => setSelectedTimetableDay(index + 1)}
                                                size="sm"
                                            >
                                                {day.slice(0, 3)}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Period List */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold">{DAY_NAMES[selectedTimetableDay - 1]} Schedule</h3>
                                            {timetableData[selectedTimetableDay]?.periods?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {timetableData[selectedTimetableDay]?.periods.map((period: any) => (
                                                        <div key={period.id} className="p-4 rounded-lg bg-secondary/20 border border-border/50 flex justify-between items-center">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary">P{period.period_number}</Badge>
                                                                    <span className="font-medium">{period.subject_name || "Unknown"}</span>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)} | {period.teacher_name || "TBA"} | {period.room || "-"}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="outline" onClick={() => handleEditPeriod(period)}>
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleDeletePeriod(period.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                                    <p>No periods added for {DAY_NAMES[selectedTimetableDay - 1]}</p>
                                                    <p className="text-sm">Use the form to add periods</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Add/Edit Period Form */}
                                        <Card className="glass-card p-4">
                                            <h3 className="font-semibold mb-4">
                                                {isEditingPeriod ? "Edit Period" : "Add Period"}
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-sm text-muted-foreground">Period #</label>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={10}
                                                            value={periodForm.period_number}
                                                            onChange={(e) => setPeriodForm({ ...periodForm, period_number: parseInt(e.target.value) || 1 })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm text-muted-foreground">Room</label>
                                                        <Input
                                                            placeholder="e.g. Lab 1"
                                                            value={periodForm.room}
                                                            onChange={(e) => setPeriodForm({ ...periodForm, room: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-sm text-muted-foreground">Subject *</label>
                                                    <select
                                                        className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                                        value={periodForm.subject_id}
                                                        onChange={(e) => setPeriodForm({ ...periodForm, subject_id: e.target.value })}
                                                    >
                                                        <option value="">Select Subject</option>
                                                        {filteredSubjectsForClass.map((s) => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm text-muted-foreground">Teacher *</label>
                                                    <select
                                                        className="w-full bg-background/50 border border-input rounded-md h-10 px-3"
                                                        value={periodForm.teacher_id}
                                                        onChange={(e) => setPeriodForm({ ...periodForm, teacher_id: e.target.value })}
                                                    >
                                                        <option value="">Select Teacher</option>
                                                        {teachers.map((t) => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-sm text-muted-foreground">Start Time</label>
                                                        <Input
                                                            type="time"
                                                            value={periodForm.start_time}
                                                            onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm text-muted-foreground">End Time</label>
                                                        <Input
                                                            type="time"
                                                            value={periodForm.end_time}
                                                            onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button className="flex-1" onClick={handleAddPeriod}>
                                                        {isEditingPeriod ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                                        {isEditingPeriod ? "Update Period" : "Add Period"}
                                                    </Button>
                                                    {isEditingPeriod && (
                                                        <Button variant="outline" onClick={resetPeriodForm}>
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
