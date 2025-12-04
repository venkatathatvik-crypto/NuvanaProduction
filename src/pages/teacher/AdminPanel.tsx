import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, BookOpen, Users, School, Save, Plus, Trash2, Key, CheckCircle, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_KEY = "rohit_sharma_the_legend"; // In a real app, this would be server-side
console.log("ADMIN PANEL LOADED FROM TIMETABLE VERSION");

const AdminPanel = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputKey, setInputKey] = useState("");

    // Mock Data State
    const [subjects, setSubjects] = useState(["Mathematics", "Physics", "Chemistry", "English", "Computer Science"]);
    const [classes, setClasses] = useState(["Class 10A", "Class 10B", "Class 11A", "Class 12A"]);

    const [teachers] = useState([
        { id: 1, name: "Sarah Wilson" },
        { id: 2, name: "John Doe" },
        { id: 3, name: "Emily Davis" },
    ]);

    const [students] = useState([
        { id: 1, name: "Alex Johnson" },
        { id: 2, name: "Sam Smith" },
        { id: 3, name: "Jordan Lee" },
    ]);

    // Mappings
    const [classAssignments, setClassAssignments] = useState<{ class: string, teachers: number[], students: number[] }[]>([]);
    const [teacherSubjects, setTeacherSubjects] = useState<{ teacherId: number, subjects: string[] }[]>([]);

    // Form States
    const [newSubject, setNewSubject] = useState("");
    const [newClass, setNewClass] = useState("");

    const [selectedClassForAssign, setSelectedClassForAssign] = useState("");
    const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState("");
    const [selectedStudentForAssign, setSelectedStudentForAssign] = useState("");

    const [selectedTeacherForMap, setSelectedTeacherForMap] = useState("");
    const [selectedSubjectForMap, setSelectedSubjectForMap] = useState("");

    // Timetable State
    const [selectedClassForTimetable, setSelectedClassForTimetable] = useState("");
    const [timetables, setTimetables] = useState<Record<string, any>>({});
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const handleTimetableUpdate = (day: string, period: number, field: 'subject' | 'teacher', value: string) => {
        setTimetables(prev => ({
            ...prev,
            [selectedClassForTimetable]: {
                ...prev[selectedClassForTimetable],
                [day]: {
                    ...prev[selectedClassForTimetable]?.[day],
                    [period]: {
                        ...prev[selectedClassForTimetable]?.[day]?.[period],
                        [field]: value
                    }
                }
            }
        }));
    };

    const handleLogin = () => {
        if (inputKey === ADMIN_KEY) {
            setIsAuthenticated(true);
            toast.success("Admin access granted");
        } else {
            toast.error("Invalid Admin Key");
        }
    };

    const addSubject = () => {
        if (newSubject && !subjects.includes(newSubject)) {
            setSubjects([...subjects, newSubject]);
            setNewSubject("");
            toast.success("Subject added");
        }
    };

    const addClass = () => {
        if (newClass && !classes.includes(newClass)) {
            setClasses([...classes, newClass]);
            setNewClass("");
            toast.success("Class added");
        }
    };

    const assignTeacherToClass = () => {
        if (!selectedClassForAssign || !selectedTeacherForAssign) return;
        // Implementation would update classAssignments state
        toast.success(`Assigned Teacher to ${selectedClassForAssign}`);
    };

    const assignStudentToClass = () => {
        if (!selectedClassForAssign || !selectedStudentForAssign) return;
        // Implementation would update classAssignments state
        toast.success(`Assigned Student to ${selectedClassForAssign}`);
    };

    const mapTeacherToSubject = () => {
        if (!selectedTeacherForMap || !selectedSubjectForMap) return;
        // Implementation would update teacherSubjects state
        toast.success("Subject mapped to teacher");
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <Card className="glass-card p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-10 h-10 text-neon-purple" />
                        </div>
                        <h1 className="text-2xl font-bold">Admin Access Required</h1>
                        <p className="text-muted-foreground">Please enter the unique admin key to continue.</p>

                        <div className="space-y-4">
                            <div className="relative">
                                <Key className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Enter Admin Key"
                                    className="pl-10 glass"
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value)}
                                />
                            </div>
                            <Button className="w-full neon-glow" onClick={handleLogin}>
                                Verify Access
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => navigate("/teacher")}>
                                Return to Dashboard
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-4xl font-bold neon-text mb-2">Admin Panel (Updated) 🛡️</h1>
                        <p className="text-muted-foreground">Manage school structure and assignments</p>
                    </div>
                    <Button variant="outline" className="glass" onClick={() => navigate("/teacher")}>
                        Exit Admin
                    </Button>
                </motion.div>

                <Tabs defaultValue="structure" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 glass p-1 h-auto">
                        <TabsTrigger value="structure">Structure</TabsTrigger>
                        <TabsTrigger value="assignments">Assignments</TabsTrigger>
                        <TabsTrigger value="mapping">Mapping</TabsTrigger>
                        <TabsTrigger value="timetable">Timetable 📅</TabsTrigger>
                    </TabsList>

                    {/* Structure Tab */}
                    <TabsContent value="structure">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <School className="w-5 h-5 text-neon-cyan" /> Manage Classes
                                </h2>
                                <div className="flex gap-2 mb-6">
                                    <Input
                                        placeholder="New Class Name (e.g., Class 10C)"
                                        value={newClass}
                                        onChange={(e) => setNewClass(e.target.value)}
                                        className="glass"
                                    />
                                    <Button onClick={addClass}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {classes.map((cls) => (
                                        <Badge key={cls} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                                            {cls}
                                            <Trash2 className="w-3 h-3 cursor-pointer hover:text-destructive" />
                                        </Badge>
                                    ))}
                                </div>
                            </Card>

                            <Card className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-neon-cyan" /> Manage Subjects
                                </h2>
                                <div className="flex gap-2 mb-6">
                                    <Input
                                        placeholder="New Subject Name"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        className="glass"
                                    />
                                    <Button onClick={addSubject}><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {subjects.map((sub) => (
                                        <Badge key={sub} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                                            {sub}
                                            <Trash2 className="w-3 h-3 cursor-pointer hover:text-destructive" />
                                        </Badge>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Assignments Tab */}
                    <TabsContent value="assignments">
                        <Card className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" /> Assign People to Classes
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-medium text-muted-foreground">Assign Teachers</h3>
                                    <div className="space-y-3">
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedClassForAssign}
                                            onChange={(e) => setSelectedClassForAssign(e.target.value)}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedTeacherForAssign}
                                            onChange={(e) => setSelectedTeacherForAssign(e.target.value)}
                                        >
                                            <option value="">Select Teacher</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <Button className="w-full" onClick={assignTeacherToClass}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Assign Teacher
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-medium text-muted-foreground">Assign Students</h3>
                                    <div className="space-y-3">
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedClassForAssign} // Shared state for simplicity in demo
                                            onChange={(e) => setSelectedClassForAssign(e.target.value)}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedStudentForAssign}
                                            onChange={(e) => setSelectedStudentForAssign(e.target.value)}
                                        >
                                            <option value="">Select Student</option>
                                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <Button className="w-full" onClick={assignStudentToClass}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Assign Student
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Mapping Tab */}
                    <TabsContent value="mapping">
                        <Card className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-neon-purple" /> Teacher Subject Mapping
                            </h2>

                            <div className="max-w-xl mx-auto space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Teacher</label>
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedTeacherForMap}
                                            onChange={(e) => setSelectedTeacherForMap(e.target.value)}
                                        >
                                            <option value="">Select Teacher</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Select Subject</label>
                                        <select
                                            className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                            value={selectedSubjectForMap}
                                            onChange={(e) => setSelectedSubjectForMap(e.target.value)}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <Button className="w-full neon-glow" onClick={mapTeacherToSubject}>
                                        <Save className="w-4 h-4 mr-2" /> Map Subject to Teacher
                                    </Button>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <h3 className="font-medium mb-4">Current Mappings</h3>
                                    <div className="space-y-2">
                                        {/* Mock display of mappings */}
                                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/10">
                                            <span>Sarah Wilson</span>
                                            <div className="flex gap-2">
                                                <Badge>Mathematics</Badge>
                                                <Badge>Physics</Badge>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/10">
                                            <span>John Doe</span>
                                            <div className="flex gap-2">
                                                <Badge>English</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Timetable Tab */}
                    <TabsContent value="timetable">
                        <Card className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-neon-cyan" /> Design Class Timetable
                            </h2>

                            <div className="space-y-6">
                                <div className="max-w-xs">
                                    <label className="text-sm text-muted-foreground mb-2 block">Select Class to Design</label>
                                    <select
                                        className="w-full p-3 rounded-lg bg-secondary/20 border border-white/10"
                                        value={selectedClassForTimetable}
                                        onChange={(e) => setSelectedClassForTimetable(e.target.value)}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {selectedClassForTimetable && (
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[1000px]">
                                            <div className="grid grid-cols-9 gap-2 mb-4">
                                                <div className="p-2 font-bold text-center bg-secondary/30 rounded flex items-center justify-center">Day / Period</div>
                                                {periods.map(p => (
                                                    <div key={p} className="p-2 font-bold text-center bg-secondary/30 rounded flex flex-col justify-center">
                                                        <span>Period {p}</span>
                                                        <span className="text-xs text-muted-foreground font-normal">
                                                            {8 + p}:00 - {9 + p}:00
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {days.map(day => (
                                                <div key={day} className="grid grid-cols-9 gap-2 mb-2">
                                                    <div className="p-2 font-semibold flex items-center justify-center bg-secondary/10 rounded">
                                                        {day}
                                                    </div>
                                                    {periods.map(period => {
                                                        const slot = timetables[selectedClassForTimetable]?.[day]?.[period] || {};
                                                        return (
                                                            <div key={period} className="p-2 bg-secondary/5 border border-white/5 rounded space-y-2">
                                                                <select
                                                                    className="w-full text-xs p-1 rounded bg-background border border-white/10"
                                                                    value={slot.subject || ""}
                                                                    onChange={(e) => handleTimetableUpdate(day, period, 'subject', e.target.value)}
                                                                >
                                                                    <option value="">Subject</option>
                                                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <select
                                                                    className="w-full text-xs p-1 rounded bg-background border border-white/10"
                                                                    value={slot.teacher || ""}
                                                                    onChange={(e) => handleTimetableUpdate(day, period, 'teacher', e.target.value)}
                                                                >
                                                                    <option value="">Teacher</option>
                                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                </select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <Button className="neon-glow" onClick={() => toast.success("Timetable saved successfully!")}>
                                                <Save className="w-4 h-4 mr-2" /> Save Timetable
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminPanel;
