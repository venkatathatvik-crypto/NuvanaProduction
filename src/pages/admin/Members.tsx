import { useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Upload, Trash2, Loader2, ArrowLeft, Search, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { userService } from "@/services/userService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OfflineEmptyState, useOfflineLoading } from "@/components/OfflineEmptyState";
import { logger } from '@/lib/logger';
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function AdminMembers() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRollNo, setNewMemberRollNo] = useState("");
  const [newMemberParentContact, setNewMemberParentContact] = useState("");
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [newMemberType, setNewMemberType] = useState<"teacher" | "student">("teacher");
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [csvImportType, setCsvImportType] = useState<"teacher" | "student">("student");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<any>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherClassFilter, setTeacherClassFilter] = useState<string>("all");
  const [studentClassFilter, setStudentClassFilter] = useState<string>("all");
  const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['members-classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
  });

  const { data: teacherClasses = [], isLoading: teacherClassesLoading } = useQuery({
    queryKey: ['members-teacher-classes'],
    queryFn: () => academicService.getTeacherClasses(),
    enabled: !!profile?.school_id,
  });

  const { data: teachersRaw = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['members-teachers'],
    queryFn: () => userService.getTeachers(),
    enabled: !!profile?.school_id,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['members-students'],
    queryFn: () => userService.getStudents(),
    enabled: !!profile?.school_id,
  });

  const teachers = teachersRaw.map((teacher) => {
    const assignedClasses = teacherClasses
      .filter((tc) => tc.teacher_id === teacher.id)
      .map((tc) => tc.classes)
      .filter(Boolean);
    return { ...teacher, assignedClasses };
  });

  const loading = classesLoading || teacherClassesLoading || teachersLoading || studentsLoading;

  const handleCreateMember = async (memberType?: "teacher" | "student") => {
    if (!newMemberName || !newMemberEmail || !newMemberPassword) {
      toast.error("Please fill all fields");
      return;
    }
    setIsCreatingMember(true);
    try {
      // Use provided memberType or fall back to state
      const typeToUse = memberType || newMemberType;
      const roleId = typeToUse === "teacher" ? 3 : 4;
      const createdUser = await userService.createUser({
        email: newMemberEmail,
        name: newMemberName,
        role_id: roleId,
        school_id: profile?.school_id,
        temporaryPassword: newMemberPassword,
      });
      if (typeToUse === "student") {
        try {
          const studentDetails: { roll_number?: string; parent_contact?: string } = {};
          if (newMemberRollNo.trim()) {
            studentDetails.roll_number = newMemberRollNo.trim();
          }
          if (newMemberParentContact.trim()) {
            studentDetails.parent_contact = newMemberParentContact.trim();
          }
          if (Object.keys(studentDetails).length > 0) {
            await userService.updateStudentDetails(createdUser.id, studentDetails);
          }
        } catch (studentDetailsError: any) {
          toast.warning("User created but student details could not be saved. You can update it later.");
        }
      }
      toast.success(`${typeToUse === "teacher" ? "Teacher" : "Student"} created successfully`);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("");
      setNewMemberRollNo("");
      setNewMemberParentContact("");
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['members-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['members-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
    } catch (error: any) {
      logger.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsCreatingMember(false);
    }
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      event.target.value = "";
      return;
    }
    setIsImporting(true);
    setImportProgress(null);
    event.target.value = "";
    try {
      const text = await file.text();
      const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        setIsImporting(false);
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIndex = header.findIndex((h) => h === "name");
      const emailIndex = header.findIndex((h) => h === "email");
      const passwordIndex = header.findIndex((h) => h === "password");
      const rollNumberIndex = header.findIndex((h) => h === "roll_number" || h === "roll number" || h === "rollnumber");
      const parentContactIndex = header.findIndex((h) => h === "parent_contact" || h === "parent contact" || h === "parentcontact");
      if (nameIndex === -1 || emailIndex === -1 || passwordIndex === -1) {
        toast.error("CSV must have 'name', 'email', and 'password' columns");
        setIsImporting(false);
        return;
      }
      const users = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          row: index + 2,
          name: values[nameIndex] || "",
          email: values[emailIndex] || "",
          password: values[passwordIndex] || "",
          roll_number: rollNumberIndex !== -1 ? values[rollNumberIndex] : undefined,
          parent_contact: parentContactIndex !== -1 ? values[parentContactIndex] : undefined,
        };
      }).filter((user) => user.name && user.email && user.password);
      if (users.length === 0) {
        toast.error("No valid user data found in CSV");
        setIsImporting(false);
        return;
      }
      setImportProgress({ total: users.length, current: 0, success: 0, failed: 0, errors: [] });
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; email: string; error: string }> = [];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        try {
          const roleId = csvImportType === "teacher" ? 3 : 4;
          const createdUser = await userService.createUser({
            email: user.email,
            name: user.name,
            role_id: roleId,
            school_id: profile?.school_id,
            temporaryPassword: user.password,
          });
          if (csvImportType === "student") {
            try {
              const studentDetails: { roll_number?: string; parent_contact?: string } = {};
              if (user.roll_number?.trim()) {
                studentDetails.roll_number = user.roll_number.trim();
              }
              if (user.parent_contact?.trim()) {
                studentDetails.parent_contact = user.parent_contact.trim();
              }
              if (Object.keys(studentDetails).length > 0) {
                await userService.updateStudentDetails(createdUser.id, studentDetails);
              }
            } catch (studentDetailsError: any) {
              logger.error(`Error saving student details for ${user.email}:`, studentDetailsError);
            }
          }
          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({ row: user.row, email: user.email, error: error.message || "Unknown error" });
        }
        setImportProgress({ total: users.length, current: i + 1, success: successCount, failed: failedCount, errors });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (successCount > 0) toast.success(`Successfully created ${successCount} ${csvImportType}(s)`);
      if (failedCount > 0) toast.error(`Failed to create ${failedCount} ${csvImportType}(s). Check details below.`);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['members-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['members-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
    } catch (error: any) {
      logger.error("CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteMember = (id: string) => {
    setMemberToDelete(id);
    setShowDeleteMemberDialog(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await userService.deleteUser(memberToDelete);
      toast.success("Member deleted successfully");
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['members-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['members-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
    } catch (error: any) {
      logger.error("Error deleting member:", error);
      toast.error(error.message || "Failed to delete member");
    } finally {
      setShowDeleteMemberDialog(false);
      setMemberToDelete(null);
    }
  };

  const filteredTeachers = teachers.filter((teacher: any) => {
    const matchesSearch =
      teacher.name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      teacher.assignedClasses?.some((cls: any) => cls?.name?.toLowerCase().includes(teacherSearch.toLowerCase()));
    const matchesClass =
      teacherClassFilter === "all" ||
      teacher.assignedClasses?.some((cls: any) => cls?.id === teacherClassFilter) ||
      (teacherClassFilter === "unassigned" && (!teacher.assignedClasses || teacher.assignedClasses.length === 0));
    return matchesSearch && matchesClass;
  });

  const filteredStudents = students.filter((student: any) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.student_details?.classes?.name?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass =
      studentClassFilter === "all" ||
      student.student_details?.classes?.id === studentClassFilter ||
      (studentClassFilter === "unassigned" && !student.student_details?.classes?.id);
    return matchesSearch && matchesClass;
  });

  const offlineLoading = useOfflineLoading(loading);

  if (offlineLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <OfflineEmptyState pageName="Members" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Members</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage teachers and students</p>
          </motion.div>
        </div>

        <Tabs defaultValue="teachers" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 glass p-1 h-auto gap-1">
            <TabsTrigger value="teachers" className="text-xs sm:text-sm px-1 sm:px-3">
              Teachers
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs sm:text-sm px-1 sm:px-3">
              Students
            </TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Teachers
              </h2>
              
              <Tabs defaultValue="add-member" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
                  <TabsTrigger value="add-member" className="text-xs sm:text-sm px-1 sm:px-3">
                    Add Member
                  </TabsTrigger>
                  <TabsTrigger value="import-csv" className="text-xs sm:text-sm px-1 sm:px-3">
                    CSV Import
                  </TabsTrigger>
                  <TabsTrigger value="members-list" className="text-xs sm:text-sm px-1 sm:px-3">
                    Members List
                  </TabsTrigger>
                </TabsList>

                {/* Add Member Tab */}
                <TabsContent value="add-member" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" /> Add New Teacher
                    </h3>
                    <div className="space-y-4">
                      <Input placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                      <Input placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                      <div className="relative">
                        <Input placeholder="Password" type={showMemberPassword ? "text" : "password"} value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} className="pr-10" />
                        <button type="button" onClick={() => setShowMemberPassword(!showMemberPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showMemberPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <Button className="w-full" onClick={() => handleCreateMember("teacher")} disabled={isCreatingMember}>
                        {isCreatingMember ? (
                          <>
                            <Loader2 className="animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create Teacher
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                {/* CSV Import Tab */}
                <TabsContent value="import-csv" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-primary" /> Import Teachers from CSV
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">CSV Format: name, email, password</p>
                        <label className="block">
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/20 transition">
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-lg font-medium mb-2">{isImporting && csvImportType === "teacher" ? "Importing..." : "Upload CSV File"}</p>
                            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                          </div>
                          <input type="file" accept=".csv" onChange={(e) => { setCsvImportType("teacher"); if (e.target.files?.[0]) handleCsvImport(e); }} disabled={isImporting && csvImportType === "teacher"} className="hidden" />
                        </label>
                      </div>
                      {isImporting && csvImportType === "teacher" && importProgress && (
                        <Card className="p-4 bg-secondary/10">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progress:</span>
                              <span className="font-medium">{importProgress.current} / {importProgress.total}</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-3">
                              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-500 font-medium">✓ Success: {importProgress.success}</span>
                              <span className="text-red-500 font-medium">✗ Failed: {importProgress.failed}</span>
                            </div>
                          </div>
                        </Card>
                      )}
                      {!isImporting && importProgress && importProgress.errors && importProgress.errors.length > 0 && (
                        <Card className="p-4 bg-destructive/10">
                          <h4 className="font-medium text-destructive mb-3">Import Errors:</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {importProgress.errors.slice(0, 20).map((err: any, idx: number) => (
                              <div key={idx} className="text-sm p-2 bg-background rounded border border-destructive/20">
                                <p className="font-medium">Row {err.row}: {err.email}</p>
                                <p className="text-xs text-muted-foreground">{err.error}</p>
                              </div>
                            ))}
                            {importProgress.errors.length > 20 && (
                              <p className="text-sm text-muted-foreground text-center">... and {importProgress.errors.length - 20} more errors</p>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Members List Tab */}
                <TabsContent value="members-list" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Teachers List
                      </h3>
                      <Badge variant="secondary">{filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search teachers..."
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <select value={teacherClassFilter} onChange={(e) => setTeacherClassFilter(e.target.value)} className="bg-muted border border-border rounded-md h-10 px-3 min-w-40">
                          <option value="all">All Classes</option>
                          <option value="unassigned">Unassigned</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredTeachers.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              {teacherSearch || teacherClassFilter !== "all" 
                                ? "No teachers found matching your filters" 
                                : "No teachers found"}
                            </p>
                          </div>
                        ) : (
                          filteredTeachers.map((t) => (
                            <Card
                              key={t.id}
                              className="p-4 hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="font-medium text-sm truncate">{t.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {t.assignedClasses && t.assignedClasses.length > 0 ? (
                                      t.assignedClasses.map((cls: any) => (
                                        <Badge key={cls.id} variant="outline" className="text-xs">
                                          {cls.name}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        Unassigned
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMember(t.id)}
                                  className="shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Students
              </h2>
              
              <Tabs defaultValue="add-member" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
                  <TabsTrigger value="add-member" className="text-xs sm:text-sm px-1 sm:px-3">
                    Add Member
                  </TabsTrigger>
                  <TabsTrigger value="import-csv" className="text-xs sm:text-sm px-1 sm:px-3">
                    CSV Import
                  </TabsTrigger>
                  <TabsTrigger value="members-list" className="text-xs sm:text-sm px-1 sm:px-3">
                    Members List
                  </TabsTrigger>
                </TabsList>

                {/* Add Member Tab */}
                <TabsContent value="add-member" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" /> Add New Student
                    </h3>
                    <div className="space-y-4">
                      <Input placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                      <Input placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                      <div className="relative">
                        <Input placeholder="Password" type={showMemberPassword ? "text" : "password"} value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} className="pr-10" />
                        <button type="button" onClick={() => setShowMemberPassword(!showMemberPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showMemberPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <Input placeholder="Roll Number (Optional)" value={newMemberRollNo} onChange={(e) => setNewMemberRollNo(e.target.value)} />
                      <Input placeholder="Parent Contact (Optional)" value={newMemberParentContact} onChange={(e) => setNewMemberParentContact(e.target.value)} />
                      <Button className="w-full" onClick={() => handleCreateMember("student")} disabled={isCreatingMember}>
                        {isCreatingMember ? (
                          <>
                            <Loader2 className="animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create Student
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                {/* CSV Import Tab */}
                <TabsContent value="import-csv" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-primary" /> Import Students from CSV
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">CSV Format: name, email, password, roll_number (optional), parent_contact (optional)</p>
                        <label className="block">
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/20 transition">
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-lg font-medium mb-2">{isImporting && csvImportType === "student" ? "Importing..." : "Upload CSV File"}</p>
                            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                          </div>
                          <input type="file" accept=".csv" onChange={(e) => { setCsvImportType("student"); if (e.target.files?.[0]) handleCsvImport(e); }} disabled={isImporting && csvImportType === "student"} className="hidden" />
                        </label>
                      </div>
                      {isImporting && csvImportType === "student" && importProgress && (
                        <Card className="p-4 bg-secondary/10">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progress:</span>
                              <span className="font-medium">{importProgress.current} / {importProgress.total}</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-3">
                              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-500 font-medium">✓ Success: {importProgress.success}</span>
                              <span className="text-red-500 font-medium">✗ Failed: {importProgress.failed}</span>
                            </div>
                          </div>
                        </Card>
                      )}
                      {!isImporting && importProgress && importProgress.errors && importProgress.errors.length > 0 && (
                        <Card className="p-4 bg-destructive/10">
                          <h4 className="font-medium text-destructive mb-3">Import Errors:</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {importProgress.errors.slice(0, 20).map((err: any, idx: number) => (
                              <div key={idx} className="text-sm p-2 bg-background rounded border border-destructive/20">
                                <p className="font-medium">Row {err.row}: {err.email}</p>
                                <p className="text-xs text-muted-foreground">{err.error}</p>
                              </div>
                            ))}
                            {importProgress.errors.length > 20 && (
                              <p className="text-sm text-muted-foreground text-center">... and {importProgress.errors.length - 20} more errors</p>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Members List Tab */}
                <TabsContent value="members-list" className="space-y-4">
                  <Card className="glass-card p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Students List
                      </h3>
                      <Badge variant="secondary">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <select value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)} className="bg-muted border border-border rounded-md h-10 px-3 min-w-40">
                          <option value="all">All Classes</option>
                          <option value="unassigned">Unassigned</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredStudents.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                              {studentSearch || studentClassFilter !== "all" 
                                ? "No students found matching your filters" 
                                : "No students found"}
                            </p>
                          </div>
                        ) : (
                          filteredStudents.map((s) => (
                            <Card
                              key={s.id}
                              className="p-4 hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="font-medium text-sm truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                                  {s.student_details?.roll_number && (
                                    <p className="text-xs text-muted-foreground mt-1">Roll No: {s.student_details.roll_number}</p>
                                  )}
                                  <div className="mt-1">
                                    {s.student_details?.classes?.name ? (
                                      <Badge variant="outline" className="text-xs">
                                        {s.student_details.classes.name}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        Unassigned
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMember(s.id)}
                                  className="shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={showDeleteMemberDialog}
        onOpenChange={setShowDeleteMemberDialog}
        onConfirm={confirmDeleteMember}
        title="Delete Member"
        description="Are you sure you want to delete this member? This action cannot be undone and will permanently remove the user and all associated data."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

