import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { School, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";

export default function AdminGrades() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (profile?.school_id) {
      fetchGrades();
    }
  }, [profile?.school_id]);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const gradesRes = await academicService.getGrades();
      setGrades(gradesRes);
    } catch (error: any) {
      console.error("Error fetching grades:", error);
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

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
      fetchGrades();
    } catch (error: any) {
      toast.error(error.message || "Failed to create grade");
    } finally {
      setAddingGrade(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this grade? This action cannot be undone.`))
      return;

    try {
      await academicService.deleteGrade(id);
      toast.success("Grade deleted successfully");
      fetchGrades();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete grade");
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
      fetchGrades();
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
    </div>
  );
}

