import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Save,
  Trash2,
  Clock,
  FileAudio,
  Download,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllTeachingClasses,
  getTeacherVoiceNotes,
  uploadTeacherVoiceNote,
  deleteTeacherVoiceNote,
  TeacherVoiceNote,
  getTeacherAllSubjectsDetailed,
} from "@/services/academic";
import { getTeacherSubjectsForClass, GradeSubjectOption } from "@/services/classService";
import { FlattenedClass } from "@/schemas/academic";
import { useAuth } from "@/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const VoiceUpload = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [recordingTitle, setRecordingTitle] = useState<string>("");
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(
    null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dropdown states
  const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState<string>("");
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voiceNoteToDelete, setVoiceNoteToDelete] = useState<TeacherVoiceNote | null>(null);

  // Navigation guard state
  const [navigationDialogOpen, setNavigationDialogOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch ALL classes where teacher teaches (both as class teacher and subject teacher)
  const { data: classes = [], isLoading: loading } = useQuery({
    queryKey: ['teacher-all-teaching-classes', profile?.id ?? '', profile?.school_id ?? ''],
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getAllTeachingClasses(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch voice notes using React Query
  const { data: recordings = [], isLoading: recordingsLoading } = useQuery({
    queryKey: queryKeys.teacher.voiceNotes(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherVoiceNotes(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Get all teacher subjects across all classes
  const { data: allTeacherSubjects = [] } = useQuery({
    queryKey: ['teacher-all-subjects', profile?.id ?? '', profile?.school_id ?? ''],
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      const subjects = await getTeacherAllSubjectsDetailed(profile.id);
      return subjects;
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter classes based on selected subject's grade level
  const filteredClassesForSubject = useMemo(() => {
    if (!selectedGradeSubjectId || !classes.length) return [];
    
    const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
    if (!selectedSubject) return [];
    
    return classes.filter(cls => cls.grade_id === selectedSubject.grade_id);
  }, [selectedGradeSubjectId, classes, allTeacherSubjects]);

  // Reset selected classes when subject changes
  useEffect(() => {
    setSelectedTargetClassIds([]);
  }, [selectedGradeSubjectId]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Browser-level navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording || audioBlob) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording, audioBlob]);

  const handleBack = () => {
    if (isRecording || audioBlob) {
      setNavigationDialogOpen(true);
    } else {
      navigate("/teacher");
    }
  };

  const startRecording = async () => {
    if (!selectedGradeSubjectId || selectedTargetClassIds.length === 0) {
      toast.error("Please select a subject and at least one class first");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/ogg",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordedChunks(chunks);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Set default title if not set
        if (!recordingTitle) {
          const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
          setRecordingTitle(
            `${selectedSubject?.subject_name || "Unknown"} - Recording ${new Date().toLocaleTimeString()}`
          );
        }

        toast.success("Recording saved locally. Ready to upload.");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedChunks([]);
      setRecordingTitle(""); // Clear title when starting new recording

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.info("Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleUpload = async () => {
    if (!audioBlob || !selectedGradeSubjectId || selectedTargetClassIds.length === 0 || !profile) {
      toast.error(
        "Please ensure subject and classes are selected and recording is ready"
      );
      return;
    }

    setIsUploading(true);
    try {
      const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
      
      const title =
        recordingTitle.trim() ||
        `${selectedSubject?.subject_name || "Recording"} - ${new Date().toLocaleTimeString()}`;

      // Upload for each selected class
      const uploadPromises = selectedTargetClassIds.map(classId =>
        uploadTeacherVoiceNote({
          file: audioBlob,
          title,
          classId: classId,
          gradeSubjectId: selectedGradeSubjectId,
          teacherId: profile.id,
          schoolId: profile.school_id,
          durationSeconds: recordingTime,
        })
      );

      await Promise.all(uploadPromises);

      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setRecordingTitle("");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      toast.success("Audio note uploaded successfully!");

      // Invalidate queries to reflect new voice note
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher.voiceNotes(profile.id, profile.school_id) });
      queryClient.invalidateQueries({ queryKey: ["student-voice-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error: any) {
      console.error("Error uploading voice note:", error);
      toast.error(error.message || "Failed to upload voice note.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedGradeSubjectId || selectedTargetClassIds.length === 0) {
      toast.error("Please select a subject and at least one class first");
      event.target.value = "";
      return;
    }

    // Store the file without uploading
    setUploadedFile(file);
    setUploadedFileName(file.name.replace(/\.[^/.]+$/, ""));
    const fileUrl = URL.createObjectURL(file);
    setUploadedFileUrl(fileUrl);
  };

  const handleUploadFile = async () => {
    if (!uploadedFile || !selectedGradeSubjectId || selectedTargetClassIds.length === 0 || !profile) {
      toast.error(
        "Please ensure subject and classes are selected and file is ready"
      );
      return;
    }

    setIsUploading(true);

    try {
      // Get audio duration using Promise
      const audio = new Audio(URL.createObjectURL(uploadedFile));

      const durationPromise = new Promise<number>((resolve) => {
        const handleMetadata = () => {
          const duration = Math.floor(audio.duration);
          audio.removeEventListener("loadedmetadata", handleMetadata);
          audio.removeEventListener("error", handleError);
          resolve(duration);
        };

        const handleError = () => {
          audio.removeEventListener("loadedmetadata", handleMetadata);
          audio.removeEventListener("error", handleError);
          resolve(0); // Default to 0 if we can't get duration
        };

        audio.addEventListener("loadedmetadata", handleMetadata);
        audio.addEventListener("error", handleError);
      });

      const durationSeconds = await durationPromise;

      const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);

      const title =
        recordingTitle.trim() ||
        uploadedFileName ||
        `${selectedSubject?.subject_name || "Upload"} - ${new Date().toLocaleTimeString()}`;

      // Upload for each selected class
      const uploadPromises = selectedTargetClassIds.map(classId =>
        uploadTeacherVoiceNote({
          file: uploadedFile,
          title,
          classId: classId,
          gradeSubjectId: selectedGradeSubjectId,
          teacherId: profile.id,
          schoolId: profile.school_id,
          durationSeconds,
        })
      );

      await Promise.all(uploadPromises);

      setRecordingTitle(""); // Clear title after upload
      setUploadedFile(null);
      setUploadedFileUrl(null);
      setUploadedFileName("");

      // Reset file input
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      toast.success("Audio note uploaded successfully!");

      // Invalidate queries to reflect new voice note
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher.voiceNotes(profile.id, profile.school_id) });
      queryClient.invalidateQueries({ queryKey: ["student-voice-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error: any) {
      console.error("Error uploading voice note:", error);
      toast.error(error.message || "Failed to upload voice note.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelFileUpload = () => {
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setUploadedFileName("");
    setRecordingTitle("");

    // Reset file input
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleDeleteClick = (voiceNote: TeacherVoiceNote) => {
    setVoiceNoteToDelete(voiceNote);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!profile || !voiceNoteToDelete) return;

    try {
      await deleteTeacherVoiceNote(
        voiceNoteToDelete.id,
        voiceNoteToDelete.storagePath,
        profile.id
      );
      toast.success("Audio note deleted successfully");

      // Invalidate queries using proper queryKeys
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.voiceNotes(profile.id, profile.school_id) 
      });
      queryClient.invalidateQueries({ queryKey: ["student-voice-notes"] });
      
      // Refetch to update UI immediately
      await queryClient.refetchQueries({ 
        queryKey: queryKeys.teacher.voiceNotes(profile.id, profile.school_id) 
      });
    } catch (error: any) {
      console.error("Error deleting voice note:", error);
      toast.error(error.message || "Failed to delete voice note.");
    } finally {
      setVoiceNoteToDelete(null);
    }
  };

  const handleDownloadVoiceNote = async (voiceNote: TeacherVoiceNote) => {
    try {
      const response = await fetch(voiceNote.storageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${voiceNote.title}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Audio note downloaded successfully");
    } catch (error) {
      console.error("Error downloading voice note:", error);
      toast.error("Failed to download voice note.");
    }
  };

  const handlePlay = async (voiceNote: TeacherVoiceNote) => {
    if (audioRef.current) {
      if (playingVoiceNoteId === voiceNote.id && !audioRef.current.paused) {
        // Pause if same voice note is playing
        audioRef.current.pause();
        setIsPlaying(false);
        setPlayingVoiceNoteId(null);
      } else {
        try {
          // Reset and load new source
          audioRef.current.pause();
          audioRef.current.src = voiceNote.storageUrl;
          audioRef.current.load();

          await audioRef.current.play();
          setIsPlaying(true);
          setPlayingVoiceNoteId(voiceNote.id);
        } catch (error) {
          console.error("Playback error:", error);
          toast.error("Cannot play this audio format. Please download it instead.");
          setIsPlaying(false);
          setPlayingVoiceNoteId(null);
        }
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">
              Audio Notes 🎙️
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Record and upload audio notes for class sessions
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recording Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="glass-card p-6 h-full flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-6">New Recording</h2>

                <div className="space-y-4 mb-6">
                  {/* Subject Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject *</label>
                    <Select
                      value={selectedGradeSubjectId}
                      onValueChange={setSelectedGradeSubjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeacherSubjects.map((subject) => (
                          <SelectItem key={subject.grade_subject_id} value={subject.grade_subject_id}>
                            {subject.subject_name} ({subject.grade_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Multi-Class Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Classes * (at least one required)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg bg-secondary/5">
                      {filteredClassesForSubject.length > 0 ? (
                        filteredClassesForSubject.map((cls) => (
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
                            <span className="text-sm font-medium">{cls.class_name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-full text-center py-2 text-xs text-amber-500 italic">
                          {selectedGradeSubjectId ? "No classes found for this subject's grade level." : "Please select a subject first."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl bg-secondary/10 mb-6">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={audioBlob !== null}
                    className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecording
                        ? "bg-red-500/20 animate-pulse shadow-lg shadow-red-500/50"
                        : "bg-blue-500/20 hover:bg-blue-500/30 shadow-lg shadow-blue-500/30"
                    }`}
                    title={isRecording ? "Click to stop recording" : "Click to start recording"}
                  >
                    <Mic
                      className={`w-16 h-16 transition-colors ${
                        isRecording ? "text-red-500" : "text-blue-500"
                      }`}
                    />
                  </button>
                  <div className="text-4xl font-mono font-bold mb-2">
                    {formatTime(recordingTime)}
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {isRecording
                      ? "Recording in progress... Click mic to stop"
                      : audioBlob
                      ? "Recording ready to upload"
                      : "Click mic icon to start recording"}
                  </p>
                </div>

                <div className="space-y-4">{audioBlob && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Recording Title
                        </label>
                        <Input
                          placeholder="Enter title for this recording"
                          value={recordingTitle}
                          onChange={(e) => setRecordingTitle(e.target.value)}
                          className="glass"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            if (audioRef.current && audioUrl) {
                              if (isPlaying) {
                                audioRef.current.pause();
                                setIsPlaying(false);
                              } else {
                                audioRef.current.src = audioUrl;
                                audioRef.current.play();
                                setIsPlaying(true);
                                audioRef.current.onended = () =>
                                  setIsPlaying(false);
                              }
                            }
                          }}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {isPlaying ? "Pause" : "Preview"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setAudioBlob(null);
                            setAudioUrl(null);
                            setRecordingTime(0);
                            setRecordingTitle("");
                            setIsPlaying(false);
                            if (audioRef.current) {
                              audioRef.current.pause();
                              audioRef.current.src = "";
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        className="w-full h-12 text-lg neon-glow"
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        <Upload className="mr-2 w-5 h-5" />
                        {isUploading ? "Uploading..." : "Upload Recording"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm font-medium mb-3">Or upload audio file as note</p>
                {!uploadedFile ? (
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="audio/*"
                      className="glass"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-primary/30">
                      <p className="text-sm font-medium mb-1">Selected File:</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {uploadedFileName}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Title (Optional)
                      </label>
                      <Input
                        placeholder="Enter title for this file"
                        value={recordingTitle}
                        onChange={(e) => setRecordingTitle(e.target.value)}
                        className="glass"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (audioRef.current && uploadedFileUrl) {
                            if (isPlaying) {
                              audioRef.current.pause();
                              setIsPlaying(false);
                            } else {
                              audioRef.current.src = uploadedFileUrl;
                              audioRef.current.play();
                              setIsPlaying(true);
                              audioRef.current.onended = () =>
                                setIsPlaying(false);
                            }
                          }
                        }}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {isPlaying ? "Pause" : "Preview"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleCancelFileUpload}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      className="w-full h-12 text-lg neon-glow"
                      onClick={handleUploadFile}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 w-5 h-5" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Hidden audio element for playback */}
              <audio
                ref={audioRef}
                className="hidden"
                onEnded={() => {
                  setIsPlaying(false);
                  setPlayingVoiceNoteId(null);
                }}
              />
            </Card>
          </motion.div>

          {/* Recent Recordings List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Recent Recordings</h2>
                <Badge
                  variant="outline"
                  className="text-primary border-primary/50"
                >
                  {recordings.length} Files
                </Badge>
              </div>

              {recordingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {recordings.map((rec) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-secondary/30 border border-white/5 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                            <FileAudio className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {rec.title}
                            </h3>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />{" "}
                                {formatTime(rec.durationSeconds)}
                              </span>
                              <span>•</span>
                              <span>
                                {
                                  new Date(rec.createdAt)
                                    .toISOString()
                                    .split("T")[0]
                                }
                              </span>
                              <span>•</span>
                              <span>{rec.className}</span>
                              {rec.size && (
                                <>
                                  <span>•</span>
                                  <span>{rec.size}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`hover:text-primary ${playingVoiceNoteId === rec.id && isPlaying
                              ? "text-primary"
                              : ""
                              }`}
                            onClick={() => handlePlay(rec)}
                          >
                            {playingVoiceNoteId === rec.id && isPlaying ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:text-neon-cyan"
                            onClick={() => handleDownloadVoiceNote(rec)}
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:text-destructive"
                            onClick={() => handleDeleteClick(rec)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {recordings.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileAudio className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No voice notes uploaded yet.</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Voice Note"
        description={
          voiceNoteToDelete
            ? `Are you sure you want to delete "${voiceNoteToDelete.title}"? This action cannot be undone and students will no longer have access to this voice note.`
            : "Are you sure you want to delete this voice note?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Navigation Confirmation Dialog */}
      <ConfirmDialog
        open={navigationDialogOpen}
        onOpenChange={setNavigationDialogOpen}
        onConfirm={() => navigate("/teacher")}
        title="Discard Recording?"
        description="You have an active recording or an unsaved audio note. Moving back will discard it. Are you sure you want to continue?"
        confirmText="Discard & Go Back"
        cancelText="Stay"
        variant="destructive"
      />
    </div>
  );
};

export default VoiceUpload;
