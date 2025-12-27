import { useState } from "react";
import { motion } from "framer-motion";
import { School, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
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

export default function AdminGrades() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newGrade, setNewGrade] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const { data: grades = [], isLoading: loading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => academicService.getGrades(),
    enabled: !!profile?.school_id,
  });

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
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['subjects-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create grade");
    } finally {
      setAddingGrade(false);
    }
  };

  const deleteItem = (id: number) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      await academicService.deleteGrade(itemToDelete);
      toast.success("Grade deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['subjects-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete grade");
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
      await academicService.updateGrade(editingItem.id, editForm.name);
      toast.success("Updated successfully");
      cancelEdit();
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-grades'] });
      queryClient.invalidateQueries({ queryKey: ['subjects-grades'] });
      queryClient.invalidateQueries({ queryKey: ['assignments-classes'] });
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2 truncate">
              Manage Grades
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base truncate">
              Create and manage grade levels
            </p>
          </div>
        </motion.div>

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
                    <tr
                      key={grade.id}
                      className="border-b border-border/50 hover:bg-secondary/20"
                    >
                      <td className="p-2">
                        {editingItem?.id === grade.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="w-full"
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(grade)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteItem(grade.id)}
                            >
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
              This action cannot be undone. This will permanently delete the grade level and all associated classes and subject mappings.
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

