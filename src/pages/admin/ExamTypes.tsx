import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function AdminExamTypes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newExamType, setNewExamType] = useState("");
  const [newExamTypeCategory, setNewExamTypeCategory] = useState<"Internal_Assessment" | "School_Exam">("Internal_Assessment");
  const [addingExamType, setAddingExamType] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const { data: examTypes = [], isLoading: loading } = useQuery({
    queryKey: ['exam-types'],
    queryFn: () => academicService.getExamTypes(),
    enabled: !!profile?.school_id,
  });

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
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create exam type");
    } finally {
      setAddingExamType(false);
    }
  };

  const deleteItem = (id: number) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await academicService.deleteExamType(itemToDelete);
      toast.success("Exam type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete exam type");
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({ name: item.name });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await academicService.updateExamType(editingItem.id, { name: editForm.name });
      toast.success("Updated successfully");
      cancelEdit();
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingEdit(false);
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
          <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Exam Types</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create and manage exam types</p>
        </motion.div>

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
                        {editingItem?.id === examType.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
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
                        {editingItem?.id === examType.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                              {savingEdit ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => startEdit(examType)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteItem(examType.id)}>
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
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exam type.
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

