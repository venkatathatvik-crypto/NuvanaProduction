import { useState, useRef, useEffect } from "react";
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
  getTeacherClasses,
  getSubjects,
  getGradeSubjectIdBySubjectName,
  getTeacherVoiceNotes,
  uploadTeacherVoiceNote,
  deleteTeacherVoiceNote,
  TeacherVoiceNote,
} from "@/services/academic";
import { FlattenedClass } from "@/schemas/academic";
import { useAuth } from "@/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const VoiceUpload = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
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
  const [recordings, setRecordings] = useState<TeacherVoiceNote[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [recordingTitle, setRecordingTitle] = useState<string>("");
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(
    null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dropdown states
  const [classes, setClasses] = useState<FlattenedClass[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<
    FlattenedClass | undefined
  >(undefined);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- EFFECT 1: INITIAL DATA LOAD (Classes) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (profileLoading) return;

      if (!profile) {
        setClasses([]);
        setSelectedClass(undefined);
        setLoading(false);
        return;
      }

      try {
        const classResponse = await getTeacherClasses(profile.id, profile.school_id);
        if (classResponse && classResponse.length > 0) {
          setClasses(classResponse);
          setSelectedClass(classResponse[0]); // Set the default class object
        } else {
          setClasses([]);
          setSelectedClass(undefined);
        }
      } catch (error) {
        console.error("Error fetching classes for voice upload:", error);
        toast.error("Failed to load classes.");
        setClasses([]);
        setSelectedClass(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [profile, profileLoading]);

  // --- EFFECT 2: DYNAMIC SUBJECT LOAD (DEPENDS ON selectedClass) ---
  useEffect(() => {
    if (selectedClass) {
      const fetchSubjectsByGrade = async () => {
        const gradeId = selectedClass.grade_id;

        try {
          const subjectResponse = await getSubjects(gradeId);
          if (subjectResponse) {
            setSubjects(subjectResponse);
            // Set the default subject based on the new class's curriculum
            if (subjectResponse.length > 0) {
              setSelectedSubject(subjectResponse[0]);
            } else {
              setSelectedSubject(""); // Clear if no subjects found
            }
          }
        } catch (error) {
          console.error(
            `Error fetching subjects for Grade ID ${gradeId}:`,
            error
          );
          setSubjects([]);
          setSelectedSubject("");
        }
      };

      fetchSubjectsByGrade();
    }
  }, [selectedClass]); // Reruns whenever selectedClass object changes

  // Fetch voice notes
  useEffect(() => {
    const fetchVoiceNotes = async () => {
      if (profileLoading) return;

      if (!profile) {
        setRecordings([]);
        setRecordingsLoading(false);
        return;
      }

      try {
        const voiceNotes = await getTeacherVoiceNotes(profile.id, profile.school_id);
        setRecordings(voiceNotes);
      } catch (error) {
        console.error("Error fetching voice notes:", error);
        toast.error("Failed to load voice notes.");
        setRecordings([]);
      } finally {
        setRecordingsLoading(false);
      }
    };

    fetchVoiceNotes();
  }, [profile, profileLoading]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c.class_id === classId);
    if (cls) {
      setSelectedClass(cls);
    }
  };

  const startRecording = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.error("Please select a class and subject first");
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
          setRecordingTitle(
            `${selectedSubject} - Recording ${new Date().toLocaleTimeString()}`
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
    if (!audioBlob || !selectedClass || !selectedSubject || !profile) {
      toast.error(
        "Please ensure class, subject are selected and recording is ready"
      );
      return;
    }

    setIsUploading(true);
    try {
      // Convert subject name to grade_subject_id
      const gradeSubjectId = await getGradeSubjectIdBySubjectName(
        selectedClass.class_id,
        selectedSubject
      );

      if (!gradeSubjectId) {
        toast.error("Failed to find subject. Please try again.");
        setIsUploading(false);
        return;
      }

      const title =
        recordingTitle.trim() ||
        `${selectedSubject} - Recording ${new Date().toLocaleTimeString()}`;

      const newVoiceNote = await uploadTeacherVoiceNote({
        file: audioBlob,
        title,
        classId: selectedClass.class_id,
        gradeSubjectId,
        teacherId: profile.id,
        schoolId: profile.school_id,
        durationSeconds: recordingTime,
      });

      setRecordings([newVoiceNote, ...recordings]);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setRecordingTitle("");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      toast.success("Voice note uploaded successfully!");
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

    if (!selectedClass || !selectedSubject) {
      toast.error("Please select a class and subject first");
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
    if (!uploadedFile || !selectedClass || !selectedSubject || !profile) {
      toast.error(
        "Please ensure class, subject are selected and file is ready"
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

      // Convert subject name to grade_subject_id
      const gradeSubjectId = await getGradeSubjectIdBySubjectName(
        selectedClass.class_id,
        selectedSubject
      );

      if (!gradeSubjectId) {
        toast.error("Failed to find subject. Please try again.");
        setIsUploading(false);
        return;
      }

      const title =
        recordingTitle.trim() ||
        uploadedFileName ||
        `${selectedSubject} - Upload ${new Date().toLocaleTimeString()}`;

      const newVoiceNote = await uploadTeacherVoiceNote({
        file: uploadedFile,
        title,
        classId: selectedClass.class_id,
        gradeSubjectId,
        teacherId: profile.id,
        schoolId: profile.school_id,
        durationSeconds,
      });

      setRecordings([newVoiceNote, ...recordings]);
      setRecordingTitle(""); // Clear title after upload
      setUploadedFile(null);
      setUploadedFileUrl(null);
      setUploadedFileName("");

      // Reset file input
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      toast.success("Voice note uploaded successfully!");
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

  const handleDelete = async (voiceNote: TeacherVoiceNote) => {
    if (!profile) return;

    if (!confirm(`Are you sure you want to delete "${voiceNote.title}"?`)) {
      return;
    }

    try {
      await deleteTeacherVoiceNote(
        voiceNote.id,
        voiceNote.storagePath,
        profile.id
      );
      setRecordings(recordings.filter((r) => r.id !== voiceNote.id));
      toast.success("Voice note deleted successfully");
    } catch (error: any) {
      console.error("Error deleting voice note:", error);
      toast.error(error.message || "Failed to delete voice note.");
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
      toast.success("Voice note downloaded successfully");
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

  if (!selectedClass) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes available or assigned.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold neon-text mb-2">
              Voice Notes 🎙️
            </h1>
            <p className="text-muted-foreground">
              Record and upload class sessions
            </p>
          </div>
          <Button
            variant="outline"
            className="glass"
            onClick={() => navigate("/teacher")}
          >
            Back to Dashboard
          </Button>
        </motion.div>

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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class</label>
                    <Select
                      value={selectedClass?.class_id || ""}
                      onValueChange={handleClassChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.class_id} value={cls.class_id}>
                            {cls.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select
                      value={selectedSubject}
                      onValueChange={setSelectedSubject}
                      disabled={!selectedClass || subjects.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                        {subjects.length === 0 && (
                          <SelectItem value="No Subjects" disabled>
                            No subjects
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl bg-secondary/10 mb-6">
                  <div
                    className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                      isRecording
                        ? "bg-red-500/20 animate-pulse"
                        : "bg-primary/20"
                    }`}
                  >
                    <Mic
                      className={`w-16 h-16 ${
                        isRecording ? "text-red-500" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="text-4xl font-mono font-bold mb-2">
                    {formatTime(recordingTime)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRecording
                      ? "Recording in progress..."
                      : "Ready to record"}
                  </p>
                </div>

                <div className="space-y-4">
                  {!isRecording && !audioBlob && (
                    <Button
                      className="w-full h-12 text-lg"
                      onClick={startRecording}
                    >
                      <Mic className="mr-2 w-5 h-5" /> Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      variant="destructive"
                      className="w-full h-12 text-lg"
                      onClick={stopRecording}
                    >
                      <Square className="mr-2 w-5 h-5 fill-current" /> Stop
                      Recording
                    </Button>
                  )}

                  {audioBlob && (
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
                <p className="text-sm font-medium mb-3">Or upload audio file</p>
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
                            className={`hover:text-primary ${
                              playingVoiceNoteId === rec.id && isPlaying
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
                            onClick={() => handleDelete(rec)}
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
    </div>
  );
};

export default VoiceUpload;
