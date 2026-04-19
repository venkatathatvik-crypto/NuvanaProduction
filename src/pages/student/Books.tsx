import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Download, Eye, FileText, Video, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getStudentData, getStudentFiles, incrementFileDownload } from "@/services/academic";
import PdfViewer from "@/components/PdfViewer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { OfflineEmptyState, useOfflineLoading } from "@/components/OfflineEmptyState";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from '@/lib/logger';
import { isFileCached, cacheFile } from "@/lib/fileCache";
import { CheckCircle2 } from "lucide-react";

const Books = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);
  const [viewingPdf, setViewingPdf] = useState<any | null>(null);

  // 1. Get Student Data (for class_id)
  const { data: studentData } = useQuery({
    queryKey: ['student-data', profile?.id],
    queryFn: () => getStudentData(profile!.id),
    enabled: !!profile?.id && !profileLoading,
  });

  const studentClassId = studentData?.class_id;

  // 2. Get Files
  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['student-files', studentClassId],
    queryFn: () => getStudentFiles(studentClassId!, profile!.school_id),
    enabled: !!studentClassId,
  });
  const [cachedFiles, setCachedFiles] = useState<Set<string>>(new Set());

  // 3. Check cache status for all files
  useEffect(() => {
    const checkCache = async () => {
      if (!files || files.length === 0) return;
      
      const newCachedFiles = new Set<string>();
      await Promise.all(
        files.map(async (file) => {
          if (await isFileCached(file.storageUrl)) {
            newCachedFiles.add(file.id);
          }
        })
      );
      setCachedFiles(newCachedFiles);
    };
    checkCache();
  }, [files]);

  const loading = loadingFiles && files.length === 0;
  const offlineLoadingFiles = useOfflineLoading(loading);

  const subjectColors: Record<string, string> = {
    Mathematics: "neon-cyan",
    Physics: "neon-purple",
    Chemistry: "neon-pink",
    "Computer Science": "neon-blue",
    English: "text-accent",
  };

  // Separate PDFs and Videos
  const pdfFiles = useMemo(() => files.filter(f => f.fileType !== 'video'), [files]);
  const videoFiles = useMemo(() => files.filter(f => f.fileType === 'video'), [files]);

  // Group PDF files by subject
  const subjects = useMemo(() => {
    if (pdfFiles.length === 0) return [];

    const groupedBySubject: Record<string, any[]> = {};

    pdfFiles.forEach((file) => {
      const subjectName = file.subject || "Other";
      if (!groupedBySubject[subjectName]) {
        groupedBySubject[subjectName] = [];
      }
      groupedBySubject[subjectName].push({
        id: file.id,
        title: file.name,
        type: "PDF",
        size: file.size || "N/A",
        downloads: file.downloads,
        storageUrl: file.storageUrl,
        storagePath: file.storagePath,
      });
    });

    return Object.keys(groupedBySubject).map((subjectName) => ({
      name: subjectName,
      color: subjectColors[subjectName] || "text-primary",
      materials: groupedBySubject[subjectName],
    }));
  }, [pdfFiles]);

  // Group video files by subject
  const videoSubjects = useMemo(() => {
    if (videoFiles.length === 0) return [];

    const groupedBySubject: Record<string, any[]> = {};

    videoFiles.forEach((file) => {
      const subjectName = file.subject || "Other";
      if (!groupedBySubject[subjectName]) {
        groupedBySubject[subjectName] = [];
      }
      groupedBySubject[subjectName].push({
        id: file.id,
        title: file.name,
        type: "Video",
        size: file.size || "N/A",
        downloads: file.downloads,
        storageUrl: file.storageUrl,
        storagePath: file.storagePath,
      });
    });

    return Object.keys(groupedBySubject).map((subjectName) => ({
      name: subjectName,
      color: subjectColors[subjectName] || "text-primary",
      videos: groupedBySubject[subjectName],
    }));
  }, [videoFiles]);

  const handleDownload = async (file: any) => {
    try {
      // Increment download count (background)
      void incrementFileDownload(file.id);

      // Explicitly cache for offline use
      toast.promise(cacheFile(file.storageUrl), {
        loading: 'Preparing for offline...',
        success: () => {
          setCachedFiles(prev => new Set(prev).add(file.id));
          return 'Saved for offline use';
        },
        error: 'Failed to save for offline'
      });

      // Force download the file to the user's device
      const response = await fetch(file.storageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.title || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update local state via invalidation
      queryClient.invalidateQueries({
        queryKey: ['student-files', studentClassId]
      });
    } catch (error) {
      logger.error("Error downloading file:", error);
      toast.error("Failed to download file.");
    }
  };

  const handleView = (file: any) => {
    setViewingPdf(file);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Books & Materials</h1>
            <p className="text-muted-foreground">Access your study materials</p>
          </motion.div>
        </div>

        {offlineLoadingFiles ? (
          <OfflineEmptyState pageName="Books & Materials" />
        ) : loading && files.length === 0 ? (
          <div className="space-y-8">
            <Card className="glass-card p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </Card>
            <div className="space-y-6">
              <Skeleton className="h-10 w-[300px]" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass-card p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : subjects.length === 0 && videoSubjects.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Materials Available</h2>
            <p className="text-muted-foreground">There are no books, materials, or videos available for your class at the moment.</p>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {subjects.reduce((acc, sub) => acc + sub.materials.length, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">PDF Documents</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-neon-purple">
                      {videoSubjects.reduce((acc, sub) => acc + sub.videos.length, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Videos</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-secondary">
                      {Math.max(subjects.length, videoSubjects.length)}
                    </p>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-neon-cyan">24/7</p>
                    <p className="text-sm text-muted-foreground">Access</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Main Tabs: Books and Videos */}
            <Tabs defaultValue="books" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="books" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Books & Documents ({subjects.reduce((acc, sub) => acc + sub.materials.length, 0)})
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Videos ({videoSubjects.reduce((acc, sub) => acc + sub.videos.length, 0)})
                </TabsTrigger>
              </TabsList>

              {/* Books Tab Content */}
              <TabsContent value="books" className="space-y-6">
                {subjects.length === 0 ? (
                  <Card className="glass-card p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No PDF documents available yet.</p>
                  </Card>
                ) : (
                  <Tabs defaultValue={subjects[0]?.name || ""} className="w-full">
                    <TabsList className="flex flex-wrap gap-2 h-auto p-2 mb-6">
                      {subjects.map((subject) => (
                        <TabsTrigger key={subject.name} value={subject.name} className="flex-shrink-0">
                          {subject.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {subjects.map((subject) => (
                      <TabsContent key={subject.name} value={subject.name} className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <BookOpen className={`w-6 h-6 text-${subject.color}`} />
                            {subject.name} Materials
                          </h2>
                        </motion.div>

                        {subject.materials.map((material, index) => (
                          <motion.div
                            key={material.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                          >
                            <Card className="glass-card p-6 hover:neon-glow transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-lg bg-primary/20">
                                    <FileText className="w-6 h-6 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold mb-2">{material.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="secondary">{material.type}</Badge>
                                      {cachedFiles.has(material.id) && (
                                        <Badge variant="outline" className="text-green-400 border-green-500/50 flex gap-1 items-center">
                                          <CheckCircle2 className="w-3 h-3" /> Stored
                                        </Badge>
                                      )}
                                      <Badge variant="outline">{material.size}</Badge>
                                      <Badge variant="outline">{material.downloads} downloads</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="glass"
                                    onClick={() => handleView(material)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="neon-glow"
                                    onClick={() => handleDownload(material)}
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
                )}
              </TabsContent>

              {/* Videos Tab Content */}
              <TabsContent value="videos" className="space-y-6">
                {videoSubjects.length === 0 ? (
                  <Card className="glass-card p-12 text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No videos available yet.</p>
                  </Card>
                ) : (
                  <Tabs defaultValue={videoSubjects[0]?.name || ""} className="w-full">
                    <TabsList className="flex flex-wrap gap-2 h-auto p-2 mb-6">
                      {videoSubjects.map((subject) => (
                        <TabsTrigger key={`video-${subject.name}`} value={subject.name} className="flex-shrink-0">
                          {subject.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {videoSubjects.map((subject) => (
                      <TabsContent key={`video-${subject.name}`} value={subject.name} className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <Video className={`w-6 h-6 text-${subject.color}`} />
                            {subject.name} Videos
                          </h2>
                        </motion.div>

                        {subject.videos.map((video, index) => (
                          <motion.div
                            key={video.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                          >
                            <Card className="glass-card p-6 hover:neon-glow transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-lg bg-neon-purple/20">
                                    <Video className="w-6 h-6 text-neon-purple" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="default" className="bg-neon-purple/20 text-neon-purple">Video</Badge>
                                      {cachedFiles.has(video.id) && (
                                        <Badge variant="outline" className="text-green-400 border-green-500/50 flex gap-1 items-center">
                                          <CheckCircle2 className="w-3 h-3" /> Stored
                                        </Badge>
                                      )}
                                      <Badge variant="outline">{video.size}</Badge>
                                      <Badge variant="outline">{video.downloads} downloads</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="glass hover:neon-glow"
                                    onClick={() => setPlayingVideo(video)}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Watch
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="neon-glow"
                                    onClick={() => handleDownload(video)}
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
                )}
              </TabsContent>
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
              <BookOpen className="w-5 h-5" />
              Study Tips
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Download materials in advance for offline access</li>
              <li>• Review reference books for better understanding</li>
              <li>• Practice with previous year papers regularly</li>
              <li>• Use formula sheets for quick revision</li>
            </ul>
          </Card>
        </motion.div>
      </div>

      <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
        <DialogContent className="sm:max-w-[800px] glass-card border-neon-purple/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold neon-text">{playingVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full mt-4 rounded-lg overflow-hidden bg-black shadow-2xl border border-white/10">
            {playingVideo && (
              <video
                controls
                autoPlay
                className="w-full h-full"
                src={playingVideo.storageUrl}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {viewingPdf && (
        <PdfViewer 
          fileId={viewingPdf.id}
          fileUrl={viewingPdf.storageUrl}
          isReadOnly={true}
          onClose={() => setViewingPdf(null)}
        />
      )}
    </div>
  );
};

export default Books;
