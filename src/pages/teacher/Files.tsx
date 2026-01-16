import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Trash2, Download, Video, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFileCategories,
  getTeacherClasses,
  getAllTeachingClasses,
  getGradeSubjectsDetailed,
  getTeacherFiles,
  uploadTeacherFile,
  deleteTeacherFile,
  incrementFileDownload,
  createNotificationsForClass,
  getStudentIdsInClass,
  getStudentEmailsInClass,
  sendFileUploadEmail,
  getTeacherAllSubjectsDetailed,
  type TeacherFileItem,
  type FileCategoryOption,
  type GradeSubjectOption,
  type TeacherClassWithRelationship,
} from "@/services/academic";
import PdfViewer from "@/components/PdfViewer";
import { getTeacherSubjectsForClass } from "@/services/classService";
import type { FlattenedClass } from "@/schemas/academic";
import { useAuth } from "@/auth/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { engagementApi } from "@/services/engagementApi";
import { engagementSocket } from "@/services/engagementSocket";

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const TeacherFiles = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();

  const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState<string>("");
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [fileTitle, setFileTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFileType, setUploadFileType] = useState<'pdf' | 'video'>('pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [classFilter, setClassFilter] = useState("All Classes");
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [fileTypeFilter, setFileTypeFilter] = useState<"All Types" | "pdf" | "video">("All Types");
  const [fileToDelete, setFileToDelete] = useState<TeacherFileItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [annotatingFile, setAnnotatingFile] = useState<TeacherFileItem | null>(null);
  const [engagementSessionId, setEngagementSessionId] = useState<string | null>(null);

  // Fetch ALL classes where teacher teaches (both as class teacher and subject teacher)
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacher-all-teaching-classes', profile?.id ?? '', profile?.school_id ?? ''],
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getAllTeachingClasses(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch ALL subjects teacher teaches across all grades
  const { data: allTeacherSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['teacher-all-subjects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return await getTeacherAllSubjectsDetailed(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch file categories using React Query
  const { data: fileCategories = [] } = useQuery({
    queryKey: queryKeys.files.categories(profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.school_id) return [];
      return await getFileCategories(profile.school_id);
    },
    enabled: !!profile?.school_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch teacher's files using React Query
  const { data: teacherFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: queryKeys.teacher.files(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherFiles(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Use teacherFiles directly from React Query (no need for separate state)

  const subjectFilterOptions = useMemo(() => {
    const set = new Set<string>();
    teacherFiles.forEach((file) => {
      if (file.subject) {
        set.add(file.subject);
      }
    });
    return ["All Subjects", ...Array.from(set).sort()];
  }, [teacherFiles]);

  // Create a stable string key from uploaded files to detect when subjects change
  const uploadedFilesSubjectsKey = useMemo(() => {
    const subjects = new Set(teacherFiles.map(f => f.subject).filter(Boolean));
    return Array.from(subjects).sort().join(',');
  }, [teacherFiles]);

  useEffect(() => {
    // Only reset if the current filter is not in the options and options exist
    if (subjectFilterOptions.length > 0 && !subjectFilterOptions.includes(subjectFilter)) {
      setSubjectFilter("All Subjects");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFilesSubjectsKey, subjectFilter]); // Use stable key from uploaded files

  // Get first subject ID in a stable way
  const firstSubjectId = useMemo(() => {
    return allTeacherSubjects.length > 0 ? allTeacherSubjects[0].grade_subject_id : null;
  }, [allTeacherSubjects]);

  // Get first category ID in a stable way
  const firstCategoryId = useMemo(() => {
    return fileCategories.length > 0 ? fileCategories[0].id : null;
  }, [fileCategories]);

  // Set default subject and category
  useEffect(() => {
    if (firstSubjectId && !selectedGradeSubjectId) {
      setSelectedGradeSubjectId(firstSubjectId);
    }
  }, [firstSubjectId, selectedGradeSubjectId]);

  useEffect(() => {
    if (firstCategoryId !== null && selectedCategoryId === null) {
      setSelectedCategoryId(firstCategoryId);
    }
  }, [firstCategoryId, selectedCategoryId]);

  // Derived: Filter classes by the selected subject's grade
  const filteredClassesForSubject = useMemo(() => {
    if (!selectedGradeSubjectId) return [];
    const subject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
    if (!subject) return [];
    
    // Filter classes that match the subject's grade level
    return classes.filter(c => c.grade_id === subject.grade_id);
  }, [selectedGradeSubjectId, allTeacherSubjects, classes]);

  // Reset selected classes when subject changes
  useEffect(() => {
    setSelectedTargetClassIds([]);
  }, [selectedGradeSubjectId]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const videoMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];

    if (uploadFileType === 'pdf') {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed for documents.");
        event.target.value = "";
        return;
      }
      if (file.size > MAX_PDF_SIZE) {
        toast.error("PDF file size must be 10MB or less.");
        event.target.value = "";
        return;
      }
    } else if (uploadFileType === 'video') {
      if (!videoMimeTypes.includes(file.type)) {
        toast.error("Only video files (MP4, WebM, OGG, MOV, AVI, WMV) are allowed.");
        event.target.value = "";
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        toast.error("Video file size must be 100MB or less.");
        event.target.value = "";
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!profile) {
      toast.error("You must be logged in to upload files.");
      return;
    }

    if (
      !fileTitle.trim() ||
      !selectedCategoryId ||
      !selectedGradeSubjectId ||
      !selectedFile ||
      selectedTargetClassIds.length === 0
    ) {
      toast.error(`Please complete all fields, select at least one class, and choose a ${uploadFileType === 'pdf' ? 'PDF' : 'video'} file.`);
      return;
    }

    setIsUploading(true);
    try {
      const subject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
      
      // Upload for each selected class
      const uploadPromises = selectedTargetClassIds.map(classId =>
        uploadTeacherFile({
          file: selectedFile,
          title: fileTitle.trim(),
          categoryId: selectedCategoryId,
          classId: classId,
          gradeSubjectId: selectedGradeSubjectId,
          teacherId: profile.id,
          schoolId: profile.school_id,
          fileType: uploadFileType,
        })
      );

      await Promise.all(uploadPromises);
      
      toast.success(`${uploadFileType === 'pdf' ? 'File' : 'Video'} uploaded successfully!`);

      // Send notifications to students in the classes
      const targetClasses = classes.filter(c => selectedTargetClassIds.includes(c.class_id));

      for (const cls of targetClasses) {
        try {
          const studentIds = await getStudentIdsInClass(cls.class_id);
          await createNotificationsForClass(studentIds, {
            school_id: profile.school_id,
            title: uploadFileType === 'pdf' ? "New File Uploaded" : "New Video Uploaded",
            message: `"${fileTitle.trim()}" has been uploaded by your teacher for ${subject?.subject_name}.`,
            notification_type: "file",
            target_url: "/student/files",
          });

          const studentEmails = await getStudentEmailsInClass(cls.class_id);
          await sendFileUploadEmail(
            studentEmails,
            fileTitle.trim(),
            uploadFileType,
            cls.class_name
          );
        } catch (err) {
          console.error(`Failed to send alerts for class ${cls.class_name}:`, err);
        }
      }

      // Invalidate caches using proper queryKeys
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.files(profile.id, profile.school_id) 
      });
      queryClient.invalidateQueries({ queryKey: ['student-books'] });
      queryClient.invalidateQueries({ queryKey: ['student-files'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Refetch to update UI immediately
      await queryClient.refetchQueries({ 
        queryKey: queryKeys.teacher.files(profile.id, profile.school_id) 
      });

      setFileTitle("");
      setSelectedFile(null);
      setSelectedTargetClassIds([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to upload file.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (fileId: string) => {
    const file = teacherFiles.find((item) => item.id === fileId);
    if (!file) {
      toast.error("Unable to find file.");
      return;
    }
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await deleteTeacherFile(fileToDelete.id, fileToDelete.storagePath);
      toast.success("File deleted successfully.");

      // Invalidate caches using proper queryKeys
      queryClient.invalidateQueries({ queryKey: ['student-books'] });
      queryClient.invalidateQueries({ queryKey: ['student-files'] });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.files(profile?.id ?? '', profile?.school_id ?? '') 
      });
      
      // Also invalidate the query that fetches the files
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.files(profile?.id ?? '', profile?.school_id ?? '') 
      });
    } catch (error) {
      console.error("Delete error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete file.";
      toast.error(message);
    } finally {
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: TeacherFileItem) => {
    if (!file.storageUrl) {
      toast.error("File URL is unavailable.");
      return;
    }

    try {
      // Force download the file
      const response = await fetch(file.storageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update download count
      await incrementFileDownload(file.id);
      
      // Invalidate query to refetch with updated download count
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.files(profile?.id ?? '', profile?.school_id ?? '') 
      });

      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file.");
    }
  };

  const filteredFiles = useMemo(() => {
    // 1. Initial Filtering by search/dropdowns
    const filtered = teacherFiles.filter((file) => {
      const classMatch =
        classFilter === "All Classes" || file.class === classFilter;
      const subjectMatch =
        subjectFilter === "All Subjects" || file.subject === subjectFilter;
      const typeMatch =
        fileTypeFilter === "All Types" || file.fileType === fileTypeFilter;
      return classMatch && subjectMatch && typeMatch;
    });

    // 2. Grouping: If a file is shared with multiple classes (multiple records),
    // we want to show it as ONE item in the list with multiple class badges.
    // We'll group by title + subject + fileType + storageUrl
    const groups: Record<string, TeacherFileItem & { classes: string[] }> = {};

    filtered.forEach(file => {
      const key = `${file.name}-${file.subject}-${file.fileType}-${file.storageUrl}`;
      if (!groups[key]) {
        groups[key] = { ...file, classes: [file.class] };
      } else {
        if (!groups[key].classes.includes(file.class)) {
          groups[key].classes.push(file.class);
        }
      }
    });

    return Object.values(groups).sort((a, b) => {
      const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
      const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [teacherFiles, classFilter, subjectFilter, fileTypeFilter]);

  // No longer blocking the whole page
  // if (loadingClasses || loadingFiles || loadingSubjects) {
  //   return <LoadingSpinner />;
  // }

  if (!loadingClasses && classes.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes available. You need to be assigned as a class teacher or subject teacher to upload files.
      </div>
    );
  }

  const totalDownloads = teacherFiles.reduce(
    (acc, file) => acc + (file.downloads ?? 0),
    0
  );

  const subjectCount = Math.max(subjectFilterOptions.length - 1, 0);

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-xl sm:text-4xl font-bold neon-text truncate">Upload Files</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Share books, notes, and materials
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {loadingFiles ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {teacherFiles.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-secondary">
                      {totalDownloads}
                    </p>
                    <p className="text-sm text-muted-foreground">Downloads</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-accent">{subjectCount}</p>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-neon-cyan">
                      {fileCategories.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {loadingClasses || loadingSubjects ? (
          <Card className="glass-card p-8 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Upload form content remains the same */}
          <Card className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              Upload New File
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  File Title
                </label>
                <Input
                  placeholder="Enter file title"
                  className="glass"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Category
                </label>
                <select
                  className="w-full p-3 rounded-lg bg-muted border border-border"
                  value={selectedCategoryId ?? ""}
                  onChange={(e) =>
                    setSelectedCategoryId(Number(e.target.value))
                  }
                >
                  {fileCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-2 block font-medium">
                  Select Subject (Grade Level)
                </label>
                <select
                  className="w-full p-3 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={selectedGradeSubjectId}
                  onChange={(e) => setSelectedGradeSubjectId(e.target.value)}
                  disabled={allTeacherSubjects.length === 0}
                >
                  {allTeacherSubjects.map((sub: any) => (
                    <option key={sub.grade_subject_id} value={sub.grade_subject_id}>
                      {sub.display_name}
                    </option>
                  ))}
                  {allTeacherSubjects.length === 0 && (
                    <option disabled>No subjects assigned</option>
                  )}
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-muted-foreground font-medium">
                      Target Classes (Select at least one)
                    </label>
                    <p className="text-xs text-muted-foreground/80">
                      Choose which classes should have access to this file
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  {filteredClassesForSubject.length > 0 ? (
                    filteredClassesForSubject.map((cls) => {
                      const classWithRelation = cls as TeacherClassWithRelationship;
                      const isClassTeacher = classWithRelation.isClassTeacher ?? false;
                      const isSubjectTeacher = classWithRelation.isSubjectTeacher ?? false;
                      
                      return (
                        <div 
                          key={cls.class_id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                            selectedTargetClassIds.includes(cls.class_id) 
                              ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                              : 'bg-muted border-border hover:border-primary/50 text-muted-foreground'
                          }`}
                          onClick={() => {
                            if (selectedTargetClassIds.includes(cls.class_id)) {
                              setSelectedTargetClassIds(prev => prev.filter(id => id !== cls.class_id));
                            } else {
                              setSelectedTargetClassIds(prev => [...prev, cls.class_id]);
                            }
                          }}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            selectedTargetClassIds.includes(cls.class_id) 
                              ? 'bg-primary border-primary' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedTargetClassIds.includes(cls.class_id) && (
                              <svg className="w-2 h-2 text-white fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{cls.class_name}</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {isClassTeacher && (
                                <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  Class Teacher
                                </Badge>
                              )}
                              {isSubjectTeacher && !isClassTeacher && (
                                <Badge variant="secondary" className="text-xs px-1 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  Subject Teacher
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="col-span-full text-center py-2 text-xs text-amber-500 italic">
                      No classes found for this subject's grade level.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* File Type Selector */}
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">
                File Type
              </label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={uploadFileType === 'pdf' ? 'default' : 'outline'}
                  className={`flex-1 ${uploadFileType === 'pdf' ? 'neon-glow' : 'glass'}`}
                  onClick={() => {
                    setUploadFileType('pdf');
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Document
                </Button>
                <Button
                  type="button"
                  variant={uploadFileType === 'video' ? 'default' : 'outline'}
                  className={`flex-1 ${uploadFileType === 'video' ? 'neon-glow' : 'glass'}`}
                  onClick={() => {
                    setUploadFileType('video');
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
              </div>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadFileType === 'pdf' ? (
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              ) : (
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              )}
              <p className="text-lg font-medium mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-muted-foreground">
                {uploadFileType === 'pdf' ? 'PDF only (max. 10MB)' : 'Video files - MP4, WebM, OGG, MOV, AVI, WMV (max. 100MB)'}
              </p>
              {selectedFile && (
                <p className="text-sm text-primary mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadFileType === 'pdf' ? 'application/pdf' : 'video/*'}
                className="hidden"
                onChange={handleFileSelection}
              />
            </div>

            <div className="flex justify-end mt-6">
              <Button
                size="lg"
                className="neon-glow px-8"
                onClick={handleUpload}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </Card>
        </motion.div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Uploaded Files</h2>
            <div className="flex gap-4">
              <select
                className="p-2 rounded-lg bg-muted border border-border"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="All Classes">All Classes</option>
                {classes.map((cls) => {
                  const classWithRelation = cls as TeacherClassWithRelationship;
                  const isClassTeacher = classWithRelation.isClassTeacher ?? false;
                  const isSubjectTeacher = classWithRelation.isSubjectTeacher ?? false;
                  let label = cls.class_name;
                  
                  if (isClassTeacher && isSubjectTeacher) {
                    label += ' (Class & Subject Teacher)';
                  } else if (isClassTeacher) {
                    label += ' (Class Teacher)';
                  } else if (isSubjectTeacher) {
                    label += ' (Subject Teacher)';
                  }
                  
                  return (
                    <option key={cls.class_id} value={cls.class_name}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <select
                className="p-2 rounded-lg bg-muted border border-border"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                {subjectFilterOptions.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <select
                className="p-2 rounded-lg bg-muted border border-border"
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value as "All Types" | "pdf" | "video")}
              >
                <option value="All Types">All Types</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredFiles.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card className="glass-card p-6 hover:neon-glow transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${file.fileType === 'video' ? 'bg-neon-purple/20' : 'bg-primary/20'}`}>
                        {file.fileType === 'video' ? (
                          <Video className="w-6 h-6 text-neon-purple" />
                        ) : (
                          <FileText className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {file.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="glass bg-primary/10 text-primary border-primary/20">{file.subject}</Badge>
                          {file.classes.map((cls, idx) => (
                            <Badge key={idx} variant="outline" className={cls === 'All Classes' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'border-border'}>
                              {cls}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="bg-muted/50">{file.category}</Badge>
                          <Badge variant={file.fileType === 'video' ? 'default' : 'outline'} className={file.fileType === 'video' ? 'bg-neon-purple/20 text-neon-purple' : ''}>
                            {file.fileType === 'video' ? 'Video' : 'PDF'}
                          </Badge>
                          <Badge variant="outline">
                            {file.downloads} downloads
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Uploaded:{" "}
                          {file.uploadDate
                            ? new Date(file.uploadDate)
                                .toISOString()
                                .split("T")[0]
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="glass border-primary/30 text-primary hover:bg-primary/10"
                          onClick={async () => {
                            // Create engagement session when opening PDF
                            try {
                              const token = localStorage.getItem('access_token');
                              if (token && profile?.school_id && profile?.id) {
                                // Find the class_id from the file's class name
                                const targetClass = classes.find(c => c.class_name === file.class);
                                
                                if (targetClass) {
                                  const session = await engagementApi.createSession({
                                    school_id: profile.school_id,
                                    teacher_id: profile.id,
                                    class_id: targetClass.class_id,
                                    file_id: file.id,
                                    session_name: `${file.name} - ${new Date().toLocaleString()}`
                                  }, token);
                                  
                                  setEngagementSessionId(session.data?.id || session.id);
                                  
                                  // Connect to WebSocket
                                  engagementSocket.connect(profile.id, 'teacher');
                                  engagementSocket.joinSession(session.data?.id || session.id, profile.id);
                                } else {
                                  console.warn('Could not find class for engagement session');
                                }
                              }
                            } catch (error) {
                              console.error('Failed to create engagement session:', error);
                              // Continue opening PDF even if session creation fails
                            }
                            
                            setAnnotatingFile(file);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Annotate
                        </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="glass"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="glass text-destructive"
                        onClick={() => handleDeleteClick(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone and students will no longer have access to this file.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {annotatingFile && (
        <PdfViewer 
          fileId={annotatingFile.id}
          fileUrl={annotatingFile.storageUrl}
          fileName={annotatingFile.name}
          sessionId={engagementSessionId || undefined}
          onClose={async () => {
            // End engagement session if exists
            if (engagementSessionId) {
              try {
                const token = localStorage.getItem('access_token');
                if (token) {
                  await engagementApi.endSession(engagementSessionId, token);
                }
              } catch (error) {
                console.error('Failed to end engagement session:', error);
              }
              setEngagementSessionId(null);
            }
            
            setAnnotatingFile(null);
            queryClient.invalidateQueries({
              queryKey: queryKeys.teacher.files(profile?.id ?? '', profile?.school_id ?? '') 
            });
          }}
        />
      )}
    </div>
  );
};

export default TeacherFiles;
