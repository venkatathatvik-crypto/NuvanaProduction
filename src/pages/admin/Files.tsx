import { useState } from "react";
import { motion } from "framer-motion";
import { Folder, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminFiles() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newFileCategory, setNewFileCategory] = useState("");
  const [addingFileCategory, setAddingFileCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const { data: fileCategories = [], isLoading: loading } = useQuery({
    queryKey: ['file-categories'],
    queryFn: () => academicService.getFileCategories(),
    enabled: !!profile?.school_id,
  });

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
      queryClient.invalidateQueries({ queryKey: ['file-categories'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create file category");
    } finally {
      setAddingFileCategory(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this file category? This action cannot be undone.")) return;
    try {
      await academicService.deleteFileCategory(id);
      toast.success("File category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['file-categories'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete file category");
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
      await academicService.updateFileCategory(editingItem.id, editForm.name);
      toast.success("Updated successfully");
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ['file-categories'] });
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
          <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage File Categories</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create and manage file categories</p>
        </motion.div>

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
                        {editingItem?.id === category.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
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
                            <Button size="sm" variant="outline" onClick={() => startEdit(category)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteItem(category.id)}>
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
    </div>
  );
}

