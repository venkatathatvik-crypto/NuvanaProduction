import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Save, Trash2, Edit, Loader2, Upload, Tag, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { lifeCoachService, type LifeCoachBook } from "@/services/lifeCoachService";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function LifeCoachBooks() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
  const [showDeleteBookDialog, setShowDeleteBookDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<any | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["life-coach-categories"],
    queryFn: () => academicService.getLifeCoachCategories(),
    enabled: !!profile?.school_id,
  });

  const { data: books = [], isLoading: loadingBooks } = useQuery({
    queryKey: ["life-coach-books"],
    queryFn: () => lifeCoachService.getBooks(),
    enabled: !!profile?.school_id,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = Array.isArray(data) && data.some((b) => b.ragStatus === "processing");
      return hasProcessing ? 5000 : false;
    },
  });

  const addCategory = async () => {
    if (!newCategory.trim()) { toast.error("Please enter a category name"); return; }
    setAddingCategory(true);
    try {
      await academicService.createLifeCoachCategory(newCategory.trim());
      toast.success("Category created");
      setNewCategory("");
      queryClient.invalidateQueries({ queryKey: ["life-coach-categories"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create category");
    } finally { setAddingCategory(false); }
  };

  const startEdit = (item: any) => { setEditingItem(item); setEditForm({ name: item.name }); };
  const cancelEdit = () => { setEditingItem(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await academicService.updateLifeCoachCategory(editingItem.id, editForm.name);
      toast.success("Updated successfully");
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["life-coach-categories"] });
    } catch (error: any) { toast.error(error.message || "Failed to update"); }
    finally { setSavingEdit(false); }
  };

  const requestDeleteCategory = (id: any) => {
    setCategoryToDelete(id);
    setShowDeleteCategoryDialog(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await academicService.deleteLifeCoachCategory(categoryToDelete);
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["life-coach-categories"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
    }
  };

  const requestDeleteBook = (id: any) => {
    setBookToDelete(id);
    setShowDeleteBookDialog(true);
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    try {
      await lifeCoachService.deleteBook(bookToDelete);
      toast.success("Book deleted");
      queryClient.invalidateQueries({ queryKey: ["life-coach-books"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete book");
    } finally {
      setShowDeleteBookDialog(false);
      setBookToDelete(null);
    }
  };

  const uploadBook = async () => {
    if (!bookTitle.trim()) { toast.error("Please enter a book title"); return; }
    if (!selectedCategoryId) { toast.error("Please select a category"); return; }
    if (!selectedFile) { toast.error("Please select a PDF file"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", bookTitle.trim());
      formData.append("categoryId", selectedCategoryId);
      await lifeCoachService.uploadBook(formData);
      toast.success("Book uploaded. RAG processing started.");
      setBookTitle(""); setSelectedCategoryId(""); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["life-coach-books"] });
    } catch (error: any) { toast.error(error.message || "Failed to upload book"); }
    finally { setUploading(false); }
  };

  if (loadingCategories || loadingBooks) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded" />
          <Skeleton className="h-64 rounded-xl" />
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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Life Coach Books</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage categories and upload books for the Life Coach AI module</p>
          </motion.div>
        </div>

        <Tabs defaultValue="categories" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
            <TabsTrigger value="categories" className="text-xs sm:text-sm px-1 sm:px-3">
              Categories
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs sm:text-sm px-1 sm:px-3">
              Upload Book
            </TabsTrigger>
            <TabsTrigger value="books" className="text-xs sm:text-sm px-1 sm:px-3">
              Books
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Categories
                </h2>
                <div className="flex gap-2">
                  <Input placeholder="e.g. Study Habits" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} className="flex-1 sm:w-48" />
                  <Button onClick={addCategory} className="shrink-0" disabled={addingCategory}>
                    {addingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add</span></>}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border"><th className="text-left p-2">Name</th><th className="text-left p-2">Created</th><th className="text-right p-2">Actions</th></tr></thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No categories yet.</td></tr>
                    ) : categories.map((cat) => (
                      <tr key={cat.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-2">{editingItem?.id === cat.id ? <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveEdit()} /> : cat.name}</td>
                        <td className="p-2 text-muted-foreground">{new Date(cat.created_at).toLocaleDateString()}</td>
                        <td className="p-2 text-right">
                          {editingItem?.id === cat.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => startEdit(cat)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => requestDeleteCategory(cat.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 mb-4 sm:mb-6">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Upload Book
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <Input placeholder="Book title" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm" />
                <Button onClick={uploadBook} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload</>}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Books Tab */}
          <TabsContent value="books">
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 mb-4 sm:mb-6">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Uploaded Books
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border"><th className="text-left p-2">Title</th><th className="text-left p-2">Category</th><th className="text-left p-2">Uploaded By</th><th className="text-left p-2">Status</th><th className="text-left p-2">Date</th><th className="text-right p-2">Actions</th></tr></thead>
                  <tbody>
                    {books.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No books uploaded yet.</td></tr>
                    ) : books.map((book) => (
                      <tr key={book.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-2 font-medium">{book.title}</td>
                        <td className="p-2 text-muted-foreground">{book.category}</td>
                        <td className="p-2 text-muted-foreground">{book.uploadedBy}</td>
                        <td className="p-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${book.ragStatus === "completed" ? "bg-green-500/20 text-green-400" : book.ragStatus === "processing" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}
                            title={book.ragStatus === "failed" && book.ragError ? book.ragError : undefined}
                          >
                            {book.ragStatus === "completed" ? "Ready" : book.ragStatus === "processing" ? "Processing…" : "Failed"}
                          </span>
                          {book.ragStatus === "failed" && book.ragError && (
                            <p className="text-xs text-red-400 mt-1 max-w-xs truncate" title={book.ragError}>
                              {book.ragError}
                            </p>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">{book.uploadDate ? new Date(book.uploadDate).toLocaleDateString() : "N/A"}</td>
                        <td className="p-2 text-right"><Button size="sm" variant="destructive" onClick={() => requestDeleteBook(book.id)}><Trash2 className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={showDeleteCategoryDialog}
        onOpenChange={setShowDeleteCategoryDialog}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        description="Are you sure you want to delete this category? You can only delete categories that have no books. If this category has books, delete them first."
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={showDeleteBookDialog}
        onOpenChange={setShowDeleteBookDialog}
        onConfirm={confirmDeleteBook}
        title="Delete Book"
        description="Are you sure you want to delete this book? This will permanently remove the book and all its AI-processed content from the Life Coach module."
        confirmText="Delete Book"
        variant="destructive"
      />
    </div>
  );
}
