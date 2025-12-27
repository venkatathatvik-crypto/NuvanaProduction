import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Folder, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

export default function AdminSettings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Exam Types state
  const [newExamType, setNewExamType] = useState("");
  const [newExamTypeCategory, setNewExamTypeCategory] = useState<"Internal_Assessment" | "School_Exam">("Internal_Assessment");
  const [addingExamType, setAddingExamType] = useState(false);
  const [editingExamType, setEditingExamType] = useState<any>(null);
  const [editExamTypeForm, setEditExamTypeForm] = useState<any>({});
  const [savingExamType, setSavingExamType] = useState(false);
  
  // File Categories state
  const [newFileCategory, setNewFileCategory] = useState("");
  const [addingFileCategory, setAddingFileCategory] = useState(false);
  const [editingFileCategory, setEditingFileCategory] = useState<any>(null);
  const [editFileCategoryForm, setEditFileCategoryForm] = useState<any>({});
  const [savingFileCategory, setSavingFileCategory] = useState(false);
  
  // Delete dialog states
  const [showDeleteExamTypeDialog, setShowDeleteExamTypeDialog] = useState(false);
  const [examTypeToDelete, setExamTypeToDelete] = useState<number | null>(null);
  const [showDeleteFileCategoryDialog, setShowDeleteFileCategoryDialog] = useState(false);
  const [fileCategoryToDelete, setFileCategoryToDelete] = useState<number | null>(null);

  const { data: examTypes = [], isLoading: examTypesLoading } = useQuery({
    queryKey: ['settings-exam-types'],
    queryFn: () => academicService.getExamTypes(),
    enabled: !!profile?.school_id,
  });

  const { data: fileCategories = [], isLoading: fileCategoriesLoading } = useQuery({
    queryKey: ['settings-file-categories'],
    queryFn: () => academicService.getFileCategories(),
    enabled: !!profile?.school_id,
  });

  const loading = examTypesLoading || fileCategoriesLoading;

  // Exam Types functions
  const addExamType = async () => {
    if (!newExamType.trim()) {
      toast.error("Please enter an exam type name");
      return;
    }
    setAddingExamType(true);
    try {
      await academicService.createExamType(newExamType.trim(), newExamTypeCategory);
      toast.success("Exam type created");
      setNewExamType("");
      setNewExamTypeCategory("Internal_Assessment");
      queryClient.invalidateQueries({ queryKey: ['settings-exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create exam type");
    } finally {
      setAddingExamType(false);
    }
  };

  const deleteExamType = (id: number) => {
    setExamTypeToDelete(id);
    setShowDeleteExamTypeDialog(true);
  };

  const confirmDeleteExamType = async () => {
    if (examTypeToDelete === null) return;
    try {
      await academicService.deleteExamType(examTypeToDelete);
      toast.success("Exam type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['settings-exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete exam type");
    } finally {
      setShowDeleteExamTypeDialog(false);
      setExamTypeToDelete(null);
    }
  };

  const startEditExamType = (item: any) => {
    setEditingExamType(item);
    setEditExamTypeForm({ name: item.name });
  };

  const cancelEditExamType = () => {
    setEditingExamType(null);
    setEditExamTypeForm({});
  };

  const saveEditExamType = async () => {
    if (!editingExamType) return;
    setSavingExamType(true);
    try {
      await academicService.updateExamType(editingExamType.id, { name: editExamTypeForm.name });
      toast.success("Updated successfully");
      cancelEditExamType();
      queryClient.invalidateQueries({ queryKey: ['settings-exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingExamType(false);
    }
  };

  // File Categories functions
  const addFileCategory = async () => {
    if (!newFileCategory.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setAddingFileCategory(true);
    try {
      await academicService.createFileCategory(newFileCategory.trim());
      toast.success("File category created");
      setNewFileCategory("");
      queryClient.invalidateQueries({ queryKey: ['settings-file-categories'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create file category");
    } finally {
      setAddingFileCategory(false);
    }
  };

  const deleteFileCategory = (id: number) => {
    setFileCategoryToDelete(id);
    setShowDeleteFileCategoryDialog(true);
  };

  const confirmDeleteFileCategory = async () => {
    if (fileCategoryToDelete === null) return;
    try {
      await academicService.deleteFileCategory(fileCategoryToDelete);
      toast.success("File category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['settings-file-categories'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete file category");
    } finally {
      setShowDeleteFileCategoryDialog(false);
      setFileCategoryToDelete(null);
    }
  };

  const startEditFileCategory = (item: any) => {
    setEditingFileCategory(item);
    setEditFileCategoryForm({ name: item.name });
  };

  const cancelEditFileCategory = () => {
    setEditingFileCategory(null);
    setEditFileCategoryForm({});
  };

  const saveEditFileCategory = async () => {
    if (!editingFileCategory) return;
    setSavingFileCategory(true);
    try {
      await academicService.updateFileCategory(editingFileCategory.id, editFileCategoryForm.name);
      toast.success("Updated successfully");
      cancelEditFileCategory();
      queryClient.invalidateQueries({ queryKey: ['settings-file-categories'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingFileCategory(false);
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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Exam & File Settings</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage exam types and file categories</p>
          </motion.div>
        </div>

        <Tabs defaultValue="exam-types" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 glass p-1 h-auto gap-1">
            <TabsTrigger value="exam-types" className="text-xs sm:text-sm px-1 sm:px-3">
              Exam Types
            </TabsTrigger>
            <TabsTrigger value="file-categories" className="text-xs sm:text-sm px-1 sm:px-3">
              File Categories
            </TabsTrigger>
          </TabsList>

          {/* Exam Types Tab */}
          <TabsContent value="exam-types">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Exam Types
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="e.g. Mid-Term"
                    value={newExamType}
                    onChange={(e) => setNewExamType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExamType()}
                    className="flex-1 sm:w-36"
                  />
                  <select
                    className="bg-muted border border-border rounded-md h-10 px-2 text-sm flex-1 sm:flex-none"
                    value={newExamTypeCategory}
                    onChange={(e) => setNewExamTypeCategory(e.target.value as "Internal_Assessment" | "School_Exam")}
                  >
                    <option value="Internal_Assessment">Internal Assessment</option>
                    <option value="School_Exam">School Exam</option>
                  </select>
                  <Button onClick={addExamType} className="shrink-0" disabled={addingExamType}>
                    {addingExamType ? (
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Exam Type Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examTypes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No exam types created yet. Use the form above to add your first exam type.
                        </td>
                      </tr>
                    ) : (
                      examTypes.map((examType) => (
                        <tr key={examType.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="p-2">
                            {editingExamType?.id === examType.id ? (
                              <Input
                                value={editExamTypeForm.name}
                                onChange={(e) => setEditExamTypeForm({ ...editExamTypeForm, name: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && saveEditExamType()}
                                className="w-full"
                              />
                            ) : (
                              examType.name
                            )}
                          </td>
                          <td className="p-2">
                            <Badge variant={examType.type === "School Exam" ? "default" : "secondary"}>
                              {examType.type || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(examType.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-right">
                            {editingExamType?.id === examType.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={saveEditExamType} disabled={savingExamType}>
                                  {savingExamType ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditExamType}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => startEditExamType(examType)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteExamType(examType.id)}>
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

          {/* File Categories Tab */}
          <TabsContent value="file-categories">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> File Categories
                </h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Assignments"
                    value={newFileCategory}
                    onChange={(e) => setNewFileCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFileCategory()}
                    className="flex-1 sm:w-48"
                  />
                  <Button onClick={addFileCategory} className="shrink-0" disabled={addingFileCategory}>
                    {addingFileCategory ? (
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
                    {fileCategories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-muted-foreground">
                          No file categories created yet. Use the form above to add your first category.
                        </td>
                      </tr>
                    ) : (
                      fileCategories.map((category) => (
                        <tr key={category.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="p-2">
                            {editingFileCategory?.id === category.id ? (
                              <Input
                                value={editFileCategoryForm.name}
                                onChange={(e) => setEditFileCategoryForm({ ...editFileCategoryForm, name: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && saveEditFileCategory()}
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
                            {editingFileCategory?.id === category.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={saveEditFileCategory} disabled={savingFileCategory}>
                                  {savingFileCategory ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditFileCategory}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => startEditFileCategory(category)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteFileCategory(category.id)}>
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
        </Tabs>
      </div>

      {/* Delete Exam Type Dialog */}
      <AlertDialog open={showDeleteExamTypeDialog} onOpenChange={setShowDeleteExamTypeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exam type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExamType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Category Dialog */}
      <AlertDialog open={showDeleteFileCategoryDialog} onOpenChange={setShowDeleteFileCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFileCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

