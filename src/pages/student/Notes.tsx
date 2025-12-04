import { motion } from "framer-motion";
import { ArrowLeft, Music, Download, Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getStudentData,
  getStudentVoiceNotes,
  type StudentVoiceNote,
} from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VoiceNoteWithPlayState extends StudentVoiceNote {
  isPlaying?: boolean;
}

interface SubjectNotes {
  name: string;
  color: string;
  notes: VoiceNoteWithPlayState[];
}

const Notes = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteWithPlayState[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentNotes = async () => {
      if (profileLoading) return;

      if (!profile) {
        setLoadingNotes(false);
        return;
      }

      try {
        // Get student data to get class_id
        const studentData = await getStudentData(profile.id);
        if (studentData?.class_id) {
          // Fetch voice notes for this class
          const notesData = await getStudentVoiceNotes(studentData.class_id);
          setVoiceNotes(notesData);
        }
      } catch (error) {
        console.error("Error fetching student voice notes:", error);
        toast.error("Failed to load voice notes.");
      } finally {
        setLoadingNotes(false);
      }
    };

    fetchStudentNotes();
  }, [profile, profileLoading]);

  const subjectColors: Record<string, string> = {
    Mathematics: "neon-cyan",
    Physics: "neon-purple",
    Chemistry: "neon-pink",
    "Computer Science": "neon-blue",
    English: "text-accent",
  };

  // Group voice notes by subject
  const subjects = useMemo(() => {
    if (voiceNotes.length === 0) return [];

    const groupedBySubject: Record<string, VoiceNoteWithPlayState[]> = {};

    for (const note of voiceNotes) {
      const subjectName = note.subject || "General";
      if (!groupedBySubject[subjectName]) {
        groupedBySubject[subjectName] = [];
      }
      groupedBySubject[subjectName].push(note);
    }

    return Object.keys(groupedBySubject).map((subjectName) => ({
      name: subjectName,
      color: subjectColors[subjectName] || "text-primary",
      notes: groupedBySubject[subjectName],
    }));
  }, [voiceNotes]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handlePlayPause = async (note: VoiceNoteWithPlayState) => {
    if (currentPlayingId === note.id) {
      // Pause current
      if (audioRef.current) {
        if (audioRef.current.paused) {
          try {
            await audioRef.current.play();
            setVoiceNotes((prev) =>
              prev.map((n) => (n.id === note.id ? { ...n, isPlaying: true } : n))
            );
          } catch (error) {
            console.error("Resume error:", error);
            toast.error("Playback failed.");
          }
        } else {
          audioRef.current.pause();
          setVoiceNotes((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, isPlaying: false } : n))
          );
        }
      }
    } else {
      // Play new note
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = note.storageUrl;
          audioRef.current.load();
          await audioRef.current.play();
          
          setCurrentPlayingId(note.id);
          setVoiceNotes((prev) =>
            prev.map((n) =>
              n.id === note.id
                ? { ...n, isPlaying: true }
                : { ...n, isPlaying: false }
            )
          );
        } catch (error) {
          console.error("Playback error:", error);
          toast.error("Cannot play this audio format. Please download it instead.");
          setCurrentPlayingId(null);
          setVoiceNotes((prev) =>
            prev.map((n) => ({ ...n, isPlaying: false }))
          );
        }
      }
    }
  };

  const handleDownload = async (note: VoiceNoteWithPlayState) => {
    try {
      // Force download the file
      const response = await fetch(note.storageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.title}.mp3`;
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/student")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Audio Notes</h1>
            <p className="text-muted-foreground">
              Listen to teacher's voice notes by subject
            </p>
          </motion.div>
        </div>

        <audio
          ref={audioRef}
          onEnded={() => {
            setCurrentPlayingId(null);
            setVoiceNotes((prev) =>
              prev.map((n) => ({ ...n, isPlaying: false }))
            );
          }}
        />

        {loadingNotes ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        ) : subjects.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">
              No Audio Notes Available
            </h2>
            <p className="text-muted-foreground">
              There are no voice notes available for your class at the moment.
            </p>
          </Card>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {subjects.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {voiceNotes.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Notes</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">MP3</p>
                    <p className="text-sm text-muted-foreground">Format</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-neon-cyan">
                      {formatDuration(
                        voiceNotes.reduce((sum, n) => sum + n.duration, 0)
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Duration
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <Tabs defaultValue={subjects[0]?.name || ""} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
                {subjects.map((subject) => (
                  <TabsTrigger key={subject.name} value={subject.name}>
                    {subject.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {subjects.map((subject) => (
                <TabsContent
                  key={subject.name}
                  value={subject.name}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                      <Music className={`w-6 h-6 text-${subject.color}`} />
                      {subject.name} - Audio Notes
                    </h2>
                  </motion.div>

                  {subject.notes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <Card className="glass-card p-6 hover:neon-glow transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 rounded-lg bg-primary/20">
                              <Music className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">
                                {note.title}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">Audio</Badge>
                                <Badge variant="outline">
                                  {formatDuration(note.duration)}
                                </Badge>
                                <Badge variant="outline">
                                  {formatFileSize(note.fileSize)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(
                                  new Date(note.uploadDate),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="glass"
                              onClick={() => handlePlayPause(note)}
                            >
                              {note.isPlaying ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Play
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="neon-glow"
                              onClick={() => handleDownload(note)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="glass-card p-6 bg-primary/5 border-primary/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Study Tips
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Listen to notes while commuting or during breaks</li>
              <li>• Download notes for offline listening</li>
              <li>• Review notes multiple times for better retention</li>
              <li>• Take notes while listening for active learning</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Notes;
