import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminSubjects() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newSubject, setNewSubject] = useState("");
  const [selectedGradeForSubject, setSelectedGradeForSubject] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [addingSubject, setAddingSubject] = useState(false);
  const [assigningSubjectsToGrade, setAssigningSubjectsToGrade] = useState(false);
  const [isImportingSubjects, setIsImportingSubjects] = useState(false);
  const [subjectImportProgress, setSubjectImportProgress] = useState<any>(null);

  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ['subjects-grades'],
    queryFn: () => academicService.getGrades(),
    enabled: !!profile?.school_id,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => academicService.getSubjects(),
    enabled: !!profile?.school_id,
  });

  const { data: gradeSubjects = [], isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['subjects-gradeSubjects'],
    queryFn: () => academicService.getGradeSubjects(),
    enabled: !!profile?.school_id,
  });

  const loading = gradesLoading || subjectsLoading || gradeSubjectsLoading;

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
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
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
      toast.success(result.message);
      setSelectedSubjects([]);
      queryClient.invalidateQueries({ queryKey: ['subjects-gradeSubjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign subjects to grade");
    } finally {
      setAssigningSubjectsToGrade(false);
    }
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
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    } catch (error: any) {
      console.error("Subject CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImportingSubjects(false);
      event.target.value = "";
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? This action cannot be undone.")) return;
    try {
      await academicService.deleteSubject(id);
      toast.success("Subject deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    }
  };

  const deleteGradeSubject = async (id: string) => {
    if (!confirm("Are you sure you want to remove this subject from the grade? This action cannot be undone.")) return;
    try {
      await academicService.deleteGradeSubject(id);
      toast.success("Subject removed from grade successfully");
      queryClient.invalidateQueries({ queryKey: ['subjects-gradeSubjects'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to remove subject from grade");
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
    <div className="min-h-screen p-3 sm:p-6">
      <BackToDashboardButton />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Subjects</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create and manage subjects</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> All Subjects
            </h2>
            <div className="space-y-4">
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" /> Import from CSV
                </h3>
                <label className="block">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/20 transition">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{isImportingSubjects ? "Importing..." : "Upload CSV File"}</p>
                  </div>
                  <input type="file" accept=".csv" onChange={handleSubjectCsvImport} disabled={isImportingSubjects} className="hidden" />
                </label>
                {isImportingSubjects && subjectImportProgress && (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress:</span>
                      <span>{subjectImportProgress.current} / {subjectImportProgress.total}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(subjectImportProgress.current / subjectImportProgress.total) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                    <span>{subject.name}</span>
                    <Button size="sm" variant="destructive" onClick={() => deleteItem(subject.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="glass-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Assign Subjects to Grades
            </h2>
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
                  <div className="border border-border rounded-md max-h-48 overflow-y-auto bg-muted/50">
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
              {selectedGradeForSubject && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-medium mb-2">Assigned Subjects:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gradeSubjects
                      .filter((gs) => gs.grade_level_id === parseInt(selectedGradeForSubject))
                      .map((gs) => (
                        <div key={gs.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary/20">
                          <span>{gs.subjects_master?.name}</span>
                          <Button size="sm" variant="destructive" onClick={() => deleteGradeSubject(gs.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

