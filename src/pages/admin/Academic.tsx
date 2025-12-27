import { useState } from "react";
import { motion } from "framer-motion";
import { School, BookOpen, Users, Plus, Save, Trash2, Edit, Loader2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminAcademic() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  
  // Grades state
  const [newGrade, setNewGrade] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [editGradeForm, setEditGradeForm] = useState<any>({});
  const [savingGrade, setSavingGrade] = useState(false);
  
  // Classes state
  const [newClass, setNewClass] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [filterGradeForClasses, setFilterGradeForClasses] = useState<string>("");
  const [addingClass, setAddingClass] = useState(false);
  const [isImportingClasses, setIsImportingClasses] = useState(false);
  const [classImportProgress, setClassImportProgress] = useState<any>(null);
  
  // Subjects state
  const [newSubject, setNewSubject] = useState("");
  const [selectedGradeForSubject, setSelectedGradeForSubject] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [addingSubject, setAddingSubject] = useState(false);
  const [assigningSubjectsToGrade, setAssigningSubjectsToGrade] = useState(false);
  const [isImportingSubjects, setIsImportingSubjects] = useState(false);
  const [subjectImportProgress, setSubjectImportProgress] = useState<any>(null);

  // React Query: Fetch data with automatic caching
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ['academic-grades'],
    queryFn: () => academicService.getGrades(),
    enabled: !!profile?.school_id,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['academic-classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: () => academicService.getSubjects(),
    enabled: !!profile?.school_id,
  });

  const { data: gradeSubjects = [], isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['academic-gradeSubjects'],
    queryFn: () => academicService.getGradeSubjects(),
    enabled: !!profile?.school_id,
  });

  const loading = gradesLoading || classesLoading || subjectsLoading || gradeSubjectsLoading;

  // Grades functions
  const addGrade = async () => {
    if (!newGrade.trim()) {
      toast.error("Please enter grade name");
      return;
    }
    setAddingGrade(true);
    try {
      await academicService.createGrade(newGrade.trim());
      toast.success("Grade created");
      setNewGrade("");
      queryClient.invalidateQueries({ queryKey: ['academic-grades'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create grade");
    } finally {
      setAddingGrade(false);
    }
  };

  const deleteGrade = async (id: number) => {
    try {
      await academicService.deleteGrade(id);
      toast.success("Grade deleted successfully");
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['academic-grades'] });
      queryClient.invalidateQueries({ queryKey: ['academic-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete grade");
    }
  };

  const handleDeleteGradeClick = (grade: any) => {
    setConfirmMessage(`Are you sure you want to delete "${grade.name}"?\n\n⚠️ Warning: This will also delete:\n• All classes in this grade\n• All student assignments to those classes\n\nThis action cannot be undone.`);
    setConfirmAction(() => () => deleteGrade(grade.id));
    setShowConfirmDialog(true);
  };

  const startEditGrade = (item: any) => {
    setEditingGrade(item);
    setEditGradeForm({ name: item.name });
  };

  const cancelEditGrade = () => {
    setEditingGrade(null);
    setEditGradeForm({});
  };

  const saveEditGrade = async () => {
    if (!editingGrade) return;
    setSavingGrade(true);
    try {
      await academicService.updateGrade(editingGrade.id, editGradeForm.name);
      toast.success("Updated successfully");
      cancelEditGrade();
      queryClient.invalidateQueries({ queryKey: ['academic-grades'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingGrade(false);
    }
  };

  // Classes functions
  const addClass = async () => {
    if (!newClass || !selectedGrade) {
      toast.error("Please enter class name and select grade");
      return;
    }
    setAddingClass(true);
    try {
      await academicService.createClass(newClass, parseInt(selectedGrade));
      toast.success("Class created");
      setNewClass("");
      setSelectedGrade("");
      queryClient.invalidateQueries({ queryKey: ['academic-classes'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create class");
    } finally {
      setAddingClass(false);
    }
  };

  const deleteClass = async (id: string) => {
    try {
      await academicService.deleteClass(id);
      toast.success("Class deleted successfully. All students have been unassigned.");
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['academic-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      queryClient.invalidateQueries({ queryKey: ['members-students'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete class");
    }
  };

  const handleDeleteClassClick = (cls: any) => {
    setConfirmMessage(`Are you sure you want to delete class "${cls.name}"?\n\n⚠️ Warning: All students assigned to this class will be unassigned.\n\nThis action cannot be undone.`);
    setConfirmAction(() => () => deleteClass(cls.id));
    setShowConfirmDialog(true);
  };

  const handleClassCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      event.target.value = "";
      return;
    }
    setIsImportingClasses(true);
    setClassImportProgress(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);
      if (lines.length < 2) {
        toast.error("CSV file must have at least a header and one data row");
        setIsImportingClasses(false);
        event.target.value = "";
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIndex = header.findIndex((h) => h === "name" || h === "class" || h === "class_name");
      const gradeIdIndex = header.findIndex((h) => h === "grade_id" || h === "gradeid");
      const gradeNameIndex = header.findIndex((h) => h === "grade" || h === "grade_name" || h === "gradename");
      if (nameIndex === -1) {
        toast.error("CSV must have a 'name' or 'class' column");
        setIsImportingClasses(false);
        event.target.value = "";
        return;
      }
      if (gradeIdIndex === -1 && gradeNameIndex === -1) {
        toast.error("CSV must have a 'grade_id' or 'grade' column");
        setIsImportingClasses(false);
        event.target.value = "";
        return;
      }
      const classData = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          row: index + 2,
          name: values[nameIndex] || "",
          gradeId: gradeIdIndex !== -1 ? values[gradeIdIndex] : undefined,
          gradeName: gradeNameIndex !== -1 ? values[gradeNameIndex] : undefined,
        };
      }).filter((cls) => cls.name && cls.name.length > 0);
      if (classData.length === 0) {
        toast.error("No valid class data found in CSV");
        setIsImportingClasses(false);
        event.target.value = "";
        return;
      }
      setClassImportProgress({ total: classData.length, current: 0, success: 0, failed: 0, errors: [] });
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; name: string; error: string }> = [];
      for (let i = 0; i < classData.length; i++) {
        const classItem = classData[i];
        try {
          let gradeId: number;
          if (classItem.gradeId) {
            gradeId = parseInt(classItem.gradeId, 10);
            if (isNaN(gradeId)) throw new Error(`Invalid grade_id: ${classItem.gradeId}`);
          } else if (classItem.gradeName) {
            const grade = grades.find((g) => g.name.toLowerCase() === classItem.gradeName?.toLowerCase());
            if (!grade) throw new Error(`Grade not found: ${classItem.gradeName}`);
            gradeId = grade.id;
          } else {
            throw new Error("Either grade_id or grade_name must be provided");
          }
          await academicService.createClass(classItem.name.trim(), gradeId);
          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({ row: classItem.row, name: classItem.name, error: error.message || "Unknown error" });
        }
        setClassImportProgress({ total: classData.length, current: i + 1, success: successCount, failed: failedCount, errors });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (successCount > 0) toast.success(`Successfully created ${successCount} class(es)`);
      if (failedCount > 0) toast.error(`Failed to create ${failedCount} class(es). Check details below.`);
      queryClient.invalidateQueries({ queryKey: ['academic-classes'] });
    } catch (error: any) {
      console.error("Class CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImportingClasses(false);
      event.target.value = "";
    }
  };

  // Subjects functions
  const addSubject = async () => {
    if (!newSubject.trim()) {
      toast.error("Please enter a subject name");
      return;
    }
    setAddingSubject(true);
    try {
      await academicService.createSubject(newSubject.trim());
      toast.success("Subject created");
      setNewSubject("");
      queryClient.invalidateQueries({ queryKey: ['academic-subjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create subject");
    } finally {
      setAddingSubject(false);
    }
  };

  const addSubjectToGrade = async () => {
    if (!selectedGradeForSubject || selectedSubjects.length === 0) {
      toast.error("Select grade and at least one subject");
      return;
    }
    setAssigningSubjectsToGrade(true);
    try {
      const result = await academicService.assignSubjectsToGrade(parseInt(selectedGradeForSubject), selectedSubjects);
      toast.success(result.message || `Successfully assigned ${selectedSubjects.length} subject(s) to grade`);
      setSelectedSubjects([]);
      queryClient.invalidateQueries({ queryKey: ['academic-gradeSubjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign subjects to grade");
    } finally {
      setAssigningSubjectsToGrade(false);
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      await academicService.deleteSubject(id);
      toast.success("Subject deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['academic-subjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    }
  };

  const handleDeleteSubjectClick = (subject: any) => {
    setConfirmMessage(`Are you sure you want to delete "${subject.name}"? This action cannot be undone.`);
    setConfirmAction(() => () => deleteSubject(subject.id));
    setShowConfirmDialog(true);
  };

  const deleteGradeSubject = async (id: string) => {
    try {
      await academicService.deleteGradeSubject(id);
      toast.success("Subject removed from grade successfully");
      queryClient.invalidateQueries({ queryKey: ['academic-gradeSubjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to remove subject from grade");
    }
  };

  const handleRemoveGradeSubjectClick = (gradeSubject: any) => {
    const subjectName = gradeSubject.subjects_master?.name || 'this subject';
    const gradeName = gradeSubject.grade_levels?.name || 'the grade';
    setConfirmMessage(`Are you sure you want to remove "${subjectName}" from ${gradeName}? This action cannot be undone.`);
    setConfirmAction(() => () => deleteGradeSubject(gradeSubject.id));
    setShowConfirmDialog(true);
  };

  const handleSubjectCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      event.target.value = "";
      return;
    }
    setIsImportingSubjects(true);
    setSubjectImportProgress(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);
      if (lines.length < 2) {
        toast.error("CSV file must have at least a header and one data row");
        setIsImportingSubjects(false);
        event.target.value = "";
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIndex = header.findIndex((h) => h === "name" || h === "subject" || h === "subject_name");
      if (nameIndex === -1) {
        toast.error("CSV must have a 'name' or 'subject' column");
        setIsImportingSubjects(false);
        event.target.value = "";
        return;
      }
      const subjectNames = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return values[nameIndex] || "";
      }).filter((name) => name && name.length > 0);
      if (subjectNames.length === 0) {
        toast.error("No valid subject data found in CSV");
        setIsImportingSubjects(false);
        event.target.value = "";
        return;
      }
      setSubjectImportProgress({ total: subjectNames.length, current: 0, success: 0, failed: 0, errors: [] });
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; name: string; error: string }> = [];
      for (let i = 0; i < subjectNames.length; i++) {
        try {
          await academicService.createSubject(subjectNames[i].trim());
          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({ row: i + 2, name: subjectNames[i], error: error.message || "Unknown error" });
        }
        setSubjectImportProgress({ total: subjectNames.length, current: i + 1, success: successCount, failed: failedCount, errors });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (successCount > 0) toast.success(`Successfully created ${successCount} subject(s)`);
      if (failedCount > 0) toast.error(`Failed to create ${failedCount} subject(s). Check details below.`);
      queryClient.invalidateQueries({ queryKey: ['academic-subjects'] });
    } catch (error: any) {
      console.error("Subject CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImportingSubjects(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredClasses = classes.filter((cls) => {
    if (!filterGradeForClasses) return true;
    return cls.grade_level_id?.toString() === filterGradeForClasses;
  });

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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Academic Setup</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage grades, classes, and subjects</p>
          </motion.div>
        </div>

        <Tabs defaultValue="grades" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
            <TabsTrigger value="grades" className="text-xs sm:text-sm px-1 sm:px-3">
              Grades
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs sm:text-sm px-1 sm:px-3">
              Classes
            </TabsTrigger>
            <TabsTrigger value="subjects" className="text-xs sm:text-sm px-1 sm:px-3">
              Subjects
            </TabsTrigger>
          </TabsList>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <School className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Grade Levels
                </h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Grade 10"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addGrade()}
                    className="flex-1 sm:w-48"
                  />
                  <Button onClick={addGrade} className="shrink-0" disabled={addingGrade}>
                    {addingGrade ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                        <span className="hidden sm:inline">Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add Grade</span>
                      </>
                    )}
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
                    {grades.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground">
                          No grades found. Create your first grade above.
                        </td>
                      </tr>
                    ) : (
                      grades.map((grade) => (
                        <tr key={grade.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="p-2">
                            {editingGrade?.id === grade.id ? (
                              <Input
                                value={editGradeForm.name}
                                onChange={(e) => setEditGradeForm({ ...editGradeForm, name: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && saveEditGrade()}
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
                            {editingGrade?.id === grade.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={saveEditGrade} disabled={savingGrade}>
                                  {savingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditGrade}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => startEditGrade(grade)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteGradeClick(grade)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Classes
              </h2>
              
              <Tabs defaultValue="manual" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 glass p-1 h-auto gap-1">
                  <TabsTrigger value="manual" className="text-xs sm:text-sm px-1 sm:px-3">
                    Manual Creation
                  </TabsTrigger>
                  <TabsTrigger value="csv-import" className="text-xs sm:text-sm px-1 sm:px-3">
                    CSV Import
                  </TabsTrigger>
                </TabsList>

                {/* Manual Creation Tab */}
                <TabsContent value="manual" className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold">Create New Class</h3>
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="bg-muted border border-border rounded-md h-10 px-3 text-sm flex-1 sm:flex-none"
                          value={selectedGrade}
                          onChange={(e) => setSelectedGrade(e.target.value)}
                        >
                          <option value="">Select Grade</option>
                          {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="e.g. 10-A"
                          value={newClass}
                          onChange={(e) => setNewClass(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addClass()}
                          className="flex-1 sm:w-32"
                        />
                        <Button onClick={addClass} className="shrink-0" disabled={addingClass}>
                          {addingClass ? (
                            <>
                              <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                              <span className="hidden sm:inline">Adding...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Add</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Filter by Grade:</label>
                      <select
                        className="bg-muted border border-border rounded-md h-10 px-3 text-sm flex-1 sm:flex-none sm:w-48"
                        value={filterGradeForClasses}
                        onChange={(e) => setFilterGradeForClasses(e.target.value)}
                      >
                        <option value="">All Grades</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id.toString()}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      {filterGradeForClasses && (
                        <Button variant="ghost" size="sm" onClick={() => setFilterGradeForClasses("")} className="shrink-0">
                          Clear Filter
                        </Button>
                      )}
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
                        {filteredClasses.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              {filterGradeForClasses ? "No classes found for the selected grade" : "No classes found"}
                            </td>
                          </tr>
                        ) : (
                          filteredClasses.map((cls) => (
                            <tr key={cls.id} className="border-b border-border/50 hover:bg-secondary/20">
                              <td className="p-2">{cls.name}</td>
                              <td className="p-2">{cls.grade_levels?.name}</td>
                              <td className="p-2 text-muted-foreground">{new Date(cls.created_at).toLocaleDateString()}</td>
                              <td className="p-2 text-right">
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteClassClick(cls)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* CSV Import Tab */}
                <TabsContent value="csv-import" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" /> Import Classes from CSV
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        CSV Format: name (or class, class_name), grade_id (or grade, grade_name)
                      </p>
                      <label className="block">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/20 transition">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-lg font-medium mb-2">{isImportingClasses ? "Importing..." : "Upload CSV File"}</p>
                          <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        </div>
                        <input type="file" accept=".csv" onChange={handleClassCsvImport} disabled={isImportingClasses} className="hidden" />
                      </label>
                    </div>
                    {isImportingClasses && classImportProgress && (
                      <Card className="p-4 bg-secondary/10">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progress:</span>
                            <span className="font-medium">{classImportProgress.current} / {classImportProgress.total}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-3">
                            <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${(classImportProgress.current / classImportProgress.total) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-500 font-medium">✓ Success: {classImportProgress.success}</span>
                            <span className="text-red-500 font-medium">✗ Failed: {classImportProgress.failed}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                    {!isImportingClasses && classImportProgress && classImportProgress.errors.length > 0 && (
                      <Card className="p-4 bg-destructive/10">
                        <h4 className="font-medium text-destructive mb-3">Import Errors:</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {classImportProgress.errors.slice(0, 20).map((err: any, idx: number) => (
                            <div key={idx} className="text-sm p-2 bg-background rounded border border-destructive/20">
                              <p className="font-medium">Row {err.row}: {err.name}</p>
                              <p className="text-xs text-muted-foreground">{err.error}</p>
                            </div>
                          ))}
                          {classImportProgress.errors.length > 20 && (
                            <p className="text-sm text-muted-foreground text-center">... and {classImportProgress.errors.length - 20} more errors</p>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Subjects
              </h2>
              
              <Tabs defaultValue="manual" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
                  <TabsTrigger value="manual" className="text-xs sm:text-sm px-1 sm:px-3">
                    Manual Creation
                  </TabsTrigger>
                  <TabsTrigger value="csv-import" className="text-xs sm:text-sm px-1 sm:px-3">
                    CSV Import
                  </TabsTrigger>
                  <TabsTrigger value="assign-grades" className="text-xs sm:text-sm px-1 sm:px-3">
                    Assign to Grades
                  </TabsTrigger>
                </TabsList>

                {/* Manual Creation Tab */}
                <TabsContent value="manual" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Mathematics"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubject()}
                      className="flex-1"
                    />
                    <Button onClick={addSubject} disabled={addingSubject}>
                      {addingSubject ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Subject
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {subjects.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No subjects found. Create your first subject above.</p>
                      </div>
                    ) : (
                      subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/20 border border-border/50">
                          <span className="font-medium">{subject.name}</span>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSubjectClick(subject)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* CSV Import Tab */}
                <TabsContent value="csv-import" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" /> Import Subjects from CSV
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        CSV Format: name (or subject, subject_name)
                      </p>
                      <label className="block">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/20 transition">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-lg font-medium mb-2">{isImportingSubjects ? "Importing..." : "Upload CSV File"}</p>
                          <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        </div>
                        <input type="file" accept=".csv" onChange={handleSubjectCsvImport} disabled={isImportingSubjects} className="hidden" />
                      </label>
                    </div>
                    {isImportingSubjects && subjectImportProgress && (
                      <Card className="p-4 bg-secondary/10">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progress:</span>
                            <span className="font-medium">{subjectImportProgress.current} / {subjectImportProgress.total}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-3">
                            <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${(subjectImportProgress.current / subjectImportProgress.total) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-500 font-medium">✓ Success: {subjectImportProgress.success}</span>
                            <span className="text-red-500 font-medium">✗ Failed: {subjectImportProgress.failed}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                    {!isImportingSubjects && subjectImportProgress && subjectImportProgress.errors.length > 0 && (
                      <Card className="p-4 bg-destructive/10">
                        <h4 className="font-medium text-destructive mb-3">Import Errors:</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {subjectImportProgress.errors.slice(0, 20).map((err: any, idx: number) => (
                            <div key={idx} className="text-sm p-2 bg-background rounded border border-destructive/20">
                              <p className="font-medium">Row {err.row}: {err.name}</p>
                              <p className="text-xs text-muted-foreground">{err.error}</p>
                            </div>
                          ))}
                          {subjectImportProgress.errors.length > 20 && (
                            <p className="text-sm text-muted-foreground text-center">... and {subjectImportProgress.errors.length - 20} more errors</p>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Assign to Grades Tab */}
                <TabsContent value="assign-grades" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="glass-card p-4 sm:p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> Assign Subjects to Grade
                      </h3>
                      <div className="space-y-4">
                        <select
                          className="w-full bg-muted border border-border rounded-md h-10 px-3"
                          value={selectedGradeForSubject}
                          onChange={(e) => {
                            setSelectedGradeForSubject(e.target.value);
                            setSelectedSubjects([]);
                          }}
                        >
                          <option value="">Select Grade</option>
                          {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {selectedGradeForSubject && (
                          <>
                            <div className="border border-border rounded-md max-h-64 overflow-y-auto bg-muted/50">
                              {subjects.map((subject) => {
                                const isAssigned = gradeSubjects.some(
                                  (gs) => gs.grade_level_id === parseInt(selectedGradeForSubject) && gs.subject_master_id === subject.id
                                );
                                return (
                                  <label
                                    key={subject.id}
                                    className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-primary/20 border-b border-border/50 last:border-0 ${selectedSubjects.includes(subject.id) ? "bg-primary/20" : ""}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedSubjects.includes(subject.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedSubjects([...selectedSubjects, subject.id]);
                                        } else {
                                          setSelectedSubjects(selectedSubjects.filter((id) => id !== subject.id));
                                        }
                                      }}
                                      disabled={isAssigned}
                                      className="w-4 h-4 rounded border-input"
                                    />
                                    <span className="text-sm flex-1">{subject.name}</span>
                                    {isAssigned && <span className="text-xs text-muted-foreground">(Assigned)</span>}
                                  </label>
                                );
                              })}
                            </div>
                            <Button onClick={addSubjectToGrade} className="w-full" disabled={assigningSubjectsToGrade || selectedSubjects.length === 0}>
                              {assigningSubjectsToGrade ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Assigning...
                                </>
                              ) : (
                                <>Assign {selectedSubjects.length} Subject(s) to Grade</>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>

                    <Card className="glass-card p-4 sm:p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> Assigned Subjects
                      </h3>
                      {selectedGradeForSubject ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {gradeSubjects
                            .filter((gs) => gs.grade_level_id === parseInt(selectedGradeForSubject))
                            .map((gs) => (
                              <div key={gs.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/20 border border-border/50">
                                <span className="font-medium">{gs.subjects_master?.name}</span>
                                <Button size="sm" variant="destructive" onClick={() => handleRemoveGradeSubjectClick(gs)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          {gradeSubjects.filter((gs) => gs.grade_level_id === parseInt(selectedGradeForSubject)).length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No subjects assigned to this grade yet.</p>
                              <p className="text-sm">Use the form on the left to assign subjects.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Select a grade to view assigned subjects.</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

