import { useState } from "react";
import { motion } from "framer-motion";
import { School, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminClasses() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newClass, setNewClass] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [filterGradeForClasses, setFilterGradeForClasses] = useState<string>("");
  const [addingClass, setAddingClass] = useState(false);
  const [classImportProgress, setClassImportProgress] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ['classes-grades'],
    queryFn: () => academicService.getGrades(),
    enabled: !!profile?.school_id,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
  });

  const loading = gradesLoading || classesLoading;

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
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create class");
    } finally {
      setAddingClass(false);
    }
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
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
    } catch (error: any) {
      console.error("Class CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImportingClasses(false);
      event.target.value = "";
    }
  };

  const deleteItem = (id: string) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await academicService.deleteClass(itemToDelete);
      toast.success("Class deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-teachers'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete class");
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
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
      <BackToDashboardButton />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Classes</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create and manage classes</p>
        </motion.div>

        <Card className="glass-card p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <School className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Classes
              </h2>
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

          <div className="mb-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Import from CSV
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">CSV Format: name (or class, class_name), grade_id (or grade, grade_name)</p>
              <label className="block">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/20 transition">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{isImportingClasses ? "Importing..." : "Upload CSV File"}</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                </div>
                <input type="file" accept=".csv" onChange={handleClassCsvImport} disabled={isImportingClasses} className="hidden" />
              </label>
            </div>
            {isImportingClasses && classImportProgress && (
              <div className="space-y-2 p-3 bg-secondary/10 rounded-lg mt-2">
                <div className="flex justify-between text-sm">
                  <span>Progress:</span>
                  <span>{classImportProgress.current} / {classImportProgress.total}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(classImportProgress.current / classImportProgress.total) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="text-green-500">✓ {classImportProgress.success}</span>
                  <span className="text-red-500">✗ {classImportProgress.failed}</span>
                </div>
              </div>
            )}
            {!isImportingClasses && classImportProgress && classImportProgress.errors.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-destructive/10 rounded-lg mt-2">
                <p className="text-sm font-medium text-destructive">Errors:</p>
                {classImportProgress.errors.slice(0, 10).map((err: any, idx: number) => (
                  <div key={idx} className="text-xs p-2 bg-background rounded">
                    <p className="font-medium">Row {err.row}: {err.name}</p>
                    <p className="text-muted-foreground">{err.error}</p>
                  </div>
                ))}
                {classImportProgress.errors.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">... and {classImportProgress.errors.length - 10} more errors</p>
                )}
              </div>
            )}
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
                        <Button size="sm" variant="destructive" onClick={() => deleteItem(cls.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the class and all associated student assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

