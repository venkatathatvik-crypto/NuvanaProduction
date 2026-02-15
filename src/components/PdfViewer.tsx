import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Document, Page, pdfjs } from 'react-pdf';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  ChevronLeft, 
  ChevronRight, 
  Pencil, 
  Highlighter, 
  RotateCcw,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  UserCircle,
  Users,
  Target,
  Columns2,
  FileText,
  Eraser as EraserIcon,
  Mic,
  Square,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { savePdfAnnotation, getPdfAnnotations } from '@/services/pdfAnnotationService';
import LoadingSpinner from './LoadingSpinner';
import { 
  PDFDocument, 
  rgb, 
  LineCapStyle
} from 'pdf-lib';
import { QuestionPanel } from './engagement/QuestionPanel';
import { useAuth } from '@/auth/AuthContext';
import { uploadTeacherVoiceNote } from '@/services/academic';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileId: string;
  fileUrl: string;
  onClose: () => void;
  isReadOnly?: boolean;
  fileName?: string;
  classId?: string;
  gradeSubjectId?: string; // Added gradeSubjectId
  sessionId?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ 
  fileId, 
  fileUrl, 
  onClose, 
  isReadOnly = false,
  fileName,
  classId,
  gradeSubjectId, // Added gradeSubjectId
  sessionId
}) => {
  const isTeacherView = !isReadOnly; // Teacher mode if not read-only
  const isStudentView = isReadOnly;

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  // Navigation Guard for recording
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

  const startRecording = async () => {
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

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        toast.success("Recording caught! Saving...");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

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
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleClose = () => {
    if (isRecording || audioBlob) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleAudioUpload = async () => {
    if (!audioBlob) {
      toast.error("No audio recorded to save.");
      return;
    }
    if (!profile) {
      toast.error("User profile not found.");
      return;
    }
    if (!classId || !gradeSubjectId) {
      console.error("Missing IDs:", { classId, gradeSubjectId });
      toast.error(`Missing metadata for upload: ${!classId ? 'Class ID' : 'Subject ID'} is missing.`);
      return;
    }

    setIsUploadingAudio(true);
    try {
      const title = `${fileName || "PDF Note"} - ${new Date().toLocaleTimeString()} (Page ${pageNumber})`;
      await uploadTeacherVoiceNote({
        file: audioBlob,
        title,
        classId,
        gradeSubjectId,
        teacherId: profile.id,
        schoolId: profile.school_id,
        durationSeconds: recordingTime,
      });

      toast.success("Audio note saved successfully!");
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

      // Invalidate queries to reflect new voice note on the audio notes page
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.voiceNotes(profile.id, profile.school_id) 
      });
      queryClient.invalidateQueries({ queryKey: ["student-voice-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload audio note.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const { profile } = useAuth();

  const queryClient = useQueryClient();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isSaving, setIsSaving] = useState(false);
  
  const [tool, setTool] = useState<'pencil' | 'highlighter' | 'eraser'>('pencil');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  const [pdfAnnotations, setPdfAnnotations] = useState<Record<number, any>>({});
  const [textNotes, setTextNotes] = useState<Record<number, string>>({});
  const [teacherNotes, setTeacherNotes] = useState<Record<number, string>>({});
  
  const [isSplitView, setIsSplitView] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [showEngagementPanel, setShowEngagementPanel] = useState(false);

  // Load annotations from backend using React Query
  const { data: fetchedAnnotations = [], isLoading: isLoadingAnnotations, isSuccess } = useQuery({
    queryKey: ['pdf-annotations', fileId, profile?.id], // Added profile?.id to avoid cache collision
    queryFn: () => getPdfAnnotations(fileId),
    enabled: !!fileId && !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });


  // Sync fetched annotations to state when they arrive
  useEffect(() => {
    if (isSuccess && profile) {
      const pdfMap: Record<number, any> = {};
      const notesMap: Record<number, string> = {};
      const tNotesMap: Record<number, string> = {};
      
      fetchedAnnotations.forEach(ann => {
        // Categorize note content based on owner
        const isOwnNote = ann.profile_id === profile.id;

        if (ann.note_type === 'SCRATCHPAD') {
          let noteText = "";
          if (typeof ann.annotation_data === 'string') {
            noteText = ann.annotation_data;
          } else if (ann.annotation_data?.text) {
            noteText = ann.annotation_data.text;
          }

          if (isOwnNote) {
            notesMap[ann.page_number] = noteText;
          } else if (!isTeacherView) { // Only students see "Teacher's Note"
            tNotesMap[ann.page_number] = noteText;
          }
        } else if (isOwnNote) {
          // Only sync own drawing annotations
          pdfMap[ann.page_number] = ann.annotation_data;
        }
      });
      
      setPdfAnnotations(prev => ({ ...prev, ...pdfMap }));
      setTextNotes(prev => {
        // Only update if current text is empty to avoid overwriting user typing
        const newMap = { ...prev };
        Object.keys(notesMap).forEach(key => {
          const pNum = Number(key);
          if (!newMap[pNum]) {
            newMap[pNum] = notesMap[pNum];
          }
        });
        return newMap;
      });
      setTeacherNotes(tNotesMap);
    }
  }, [isSuccess, fetchedAnnotations, profile?.id]);

  // Handle page change - save current paths to local state
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > (numPages || 1)) return;
    
    // Save current PDF canvas
    if (canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      setPdfAnnotations(prev => ({ ...prev, [pageNumber]: paths }));
    }
    
    setPageNumber(newPage);
  };

  // Load paths when pageNumber or data changes
  useEffect(() => {
    if (pdfLoaded) {
      // Load PDF annotations
      if (canvasRef.current) {
        const pPaths = pdfAnnotations[pageNumber] || [];
        if (pPaths.length > 0) {
          canvasRef.current.loadPaths(pPaths);
        } else {
          canvasRef.current.clearCanvas();
        }
      }
    }
  }, [pageNumber, pdfLoaded, pdfAnnotations]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoaded(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Sync current page to local state first
      let currentPdfPaths = pdfAnnotations[pageNumber] || [];
      const currentTextNote = textNotes[pageNumber] || "";
      
      if (canvasRef.current) {
        currentPdfPaths = await canvasRef.current.exportPaths();
        setPdfAnnotations(prev => ({ ...prev, [pageNumber]: currentPdfPaths }));
      }
      setTextNotes(prev => ({ ...prev, [pageNumber]: currentTextNote }));

      // 2. Identify all pages that have data
      const allPages = new Set([
        ...Object.keys(pdfAnnotations).map(Number),
        ...Object.keys(textNotes).map(Number),
        pageNumber // Ensure current page is included
      ]);

      // 3. Prepare all save promises
      const promises: Promise<any>[] = [];
      
      allPages.forEach(pNum => {
        const pPaths = pNum === pageNumber ? currentPdfPaths : (pdfAnnotations[pNum] || []);
        const pNote = pNum === pageNumber ? currentTextNote : (textNotes[pNum] || "");

        // Only save if there's actual data OR if it was previously saved (to allow clearing)
        const hasExistingAnnotation = fetchedAnnotations.some(a => a.page_number === pNum && a.note_type === 'ANNOTATION');
        const hasExistingNote = fetchedAnnotations.some(a => a.page_number === pNum && a.note_type === 'SCRATCHPAD');

        if (pPaths.length > 0 || hasExistingAnnotation) {
          promises.push(savePdfAnnotation(fileId, pNum, pPaths, 'ANNOTATION'));
        }
        if (pNote.trim().length > 0 || hasExistingNote) {
          promises.push(savePdfAnnotation(fileId, pNum, pNote, 'SCRATCHPAD'));
        }
      });
      
      if (promises.length > 0) {
        await Promise.all(promises);
        // 4. Invalidate cache to ensure refresh on reopen
        await queryClient.invalidateQueries({ queryKey: ['pdf-annotations', fileId] });
      }
      
      toast.success("All notes saved to cloud!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save some notes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!numPages || isDownloading) return;
    
    setIsDownloading(true);
    const toastId = toast.loading("Generating High-Performance PDF...");
    
    try {
      // 1. Fetch original PDF bytes
      const response = await fetch(fileUrl);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Helper to convert hex to RGB
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      // 3. Process each page with annotations
      const localPdfAnnotations = { ...pdfAnnotations };
      
      if (canvasRef.current) {
        localPdfAnnotations[pageNumber] = await canvasRef.current.exportPaths();
      }

      for (let i = 1; i <= numPages; i++) {
        const allPaths = localPdfAnnotations[i] || [];

        if (allPaths.length === 0) continue;

        const page = pages[i - 1]; // 0-indexed
        const { width: pdfWidth, height: pdfHeight } = page.getSize();

        // IMPORTANT: We need the rendered canvas dimensions to map coordinates.
        // We'll use the current canvas element for sizing.
        const canvasElement = pdfContainerRef.current;
        const canvasWidth = canvasElement?.offsetWidth || pdfWidth;
        const canvasHeight = canvasElement?.offsetHeight || pdfHeight;

        const scaleX = pdfWidth / canvasWidth;
        const scaleY = pdfHeight / canvasHeight;

        for (const path of allPaths) {
          const hex = path.strokeColor.substring(0, 7);
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          const color = rgb(r, g, b);
          
          const isHighlighter = path.strokeColor.length > 7 || path.strokeWidth > 15;
          const opacity = isHighlighter ? 0.25 : 0.9;

          if (path.paths.length < 2) continue;

          // Convert to SVG path data for atomic drawing (prevents overlap artifacts)
          const start = path.paths[0];
          const svgPathData = path.paths.slice(1).reduce((acc, p) => {
            const dx = (p.x - start.x) * scaleX;
            const dy = (p.y - start.y) * scaleY;
            // PDF-lib flips the SVG Y-axis vertically relative to the PDF's bottom-left origin.
            // Since browser Y and SVG Y both increase downwards, we can use the browser delta directly.
            return `${acc} L ${dx.toFixed(2)} ${dy.toFixed(2)}`;
          }, "M 0 0");

          const startX = start.x * scaleX;
          const startY = pdfHeight - (start.y * scaleY);

          page.drawSvgPath(svgPathData, {
            x: startX,
            y: startY,
            borderColor: color,
            borderWidth: path.strokeWidth * scaleX,
            borderOpacity: opacity,
            borderLineCap: LineCapStyle.Round,
          });
        }
      }

      // 4. Save and trigger download
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Annotated_${fileId.substring(0, 8)}.pdf`;
      link.click();
      
      toast.success("PDF Generated Instantly!", { id: toastId });
    } catch (error) {
      console.error("Fast download error:", error);
      toast.error("Fast export failed. Please try again.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) canvasRef.current.clearCanvas();
    setTextNotes(prev => ({ ...prev, [pageNumber]: "" }));
  };

  const undo = () => {
    if (canvasRef.current) canvasRef.current.undo();
  };

  // Determine if we should show the loading overlay
  const showLoadingOverlay = isLoadingAnnotations || !pdfLoaded;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm shadow-2xl overflow-hidden">
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner size="lg" className="min-h-0" />
              <p className="text-lg font-medium animate-pulse text-neon-blue">
                Preparing your Workspace...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Overlay during Download */}
      {isDownloading && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
          <LoadingSpinner />
          <p className="mt-4 text-lg font-medium animate-pulse text-primary">Generating your PDF... Please wait.</p>
          <p className="text-sm text-muted-foreground mt-2">Exporting {numPages} pages with annotations</p>
        </div>
      )}

      {/* Header / Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">PDF Annotator</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handlePageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handlePageChange(pageNumber + 1)}
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isSplitView ? "default" : "outline"}
            className={isSplitView ? "neon-glow" : ""}
            onClick={() => setIsSplitView(!isSplitView)}
            title="Toggle Split View"
          >
            <Columns2 className="w-4 h-4 mr-2" />
            {isSplitView ? "Hide Notes" : "Split View"}
          </Button>

          <Button 
            size="sm" 
            className="neon-glow" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Notes"}
          </Button>

          {isReadOnly && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Exporting..." : "Download PDF"}
            </Button>
          )}

          {/* Engagement Button (Teachers only) */}
          {!isReadOnly && sessionId && pdfLoaded && (
            <Button 
              size="sm" 
              className="neon-glow bg-primary text-primary-foreground"
              onClick={() => setShowEngagementPanel(true)}
            >
              <Target className="w-4 h-4 mr-2" />
              Nuva Pulse
            </Button>
          )}

          {/* Audio Note (Teachers only) */}
          {!isReadOnly && pdfLoaded && (
            <div className="flex items-center gap-2 border-l pl-2 border-border ml-2">
              {!isRecording && !audioBlob && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  onClick={startRecording}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              )}
              
              {isRecording && (
                <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20 animate-pulse">
                  <Square className="w-4 h-4 text-destructive cursor-pointer" onClick={stopRecording} />
                  <span className="text-destructive text-xs font-bold font-mono w-10">{formatTime(recordingTime)}</span>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-primary text-xs font-medium bg-primary/10 px-2 py-1 rounded-md">
                    <Clock className="w-3 h-3" />
                    {formatTime(recordingTime)}
                  </div>
                  <Button 
                    size="sm" 
                    className="neon-glow"
                    onClick={handleAudioUpload}
                    disabled={isUploadingAudio}
                  >
                    {isUploadingAudio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isUploadingAudio ? "Saving..." : "Save Voice"}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-muted-foreground w-8 h-8 rounded-full"
                    onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 border-l pl-2 border-border ml-2">
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.5, s + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar - Annotation Tools */}
        <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4 gap-4 overflow-y-auto">
          {isReadOnly && (
            <div className="text-[10px] text-primary font-bold uppercase mb-2">Student</div>
          )}
            <Button 
              variant={tool === 'pencil' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => {
                setTool('pencil');
                setStrokeWidth(4);
              }}
              className={tool === 'pencil' ? 'neon-glow' : ''}
              title="Pencil"
            >
              <Pencil className="w-5 h-5" />
            </Button>
            <Button 
              variant={tool === 'highlighter' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => {
                setTool('highlighter');
                setStrokeWidth(20);
              }}
              className={tool === 'highlighter' ? 'bg-yellow-400/20 text-yellow-500 hover:bg-yellow-400/30' : ''}
              title="Highlighter"
            >
              <Highlighter className="w-5 h-5" />
            </Button>
            <Button 
              variant={tool === 'eraser' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setTool('eraser')}
              title="Eraser"
            >
              <EraserIcon className="w-5 h-5" />
            </Button>
            
            <div className="h-px w-8 bg-border my-2" />
            
            {/* Colors */}
            {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#000000', '#ffffff'].map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${strokeColor === color ? 'scale-125 border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
                onClick={() => setStrokeColor(color)}
              />
            ))}
            
            <div className="h-px w-8 bg-border my-2" />
            
            <Button variant="ghost" size="icon" onClick={undo} title="Undo">
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearCanvas} title="Clear Page">
              <X className="w-5 h-5 text-destructive" />
            </Button>
          </div>

        {/* PDF Rendering Area */}
        <div className="flex-1 overflow-auto bg-muted/30 p-2 sm:p-4 flex flex-col md:flex-row gap-4 items-center md:items-start justify-center">
          {/* Main PDF Page */}
          <div 
            ref={pdfContainerRef} 
            className="relative shadow-2xl bg-white shrink-0" 
            style={{ 
              width: 'fit-content',
              maxWidth: isSplitView ? '45%' : '100%' 
            }}
          >
            {isLoadingAnnotations && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
                <LoadingSpinner />
              </div>
            )}
            
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-20"><LoadingSpinner /></div>}
              onLoadError={(error) => {
                console.error("PDF Load Error:", error);
                toast.error("External PDF blocked by CORS.");
              }}
              error={
                <div className="p-10 text-center space-y-4">
                  <p className="text-destructive font-medium">Failed to load PDF file.</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                    Open in New Tab
                  </Button>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={isSplitView ? scale * 0.8 : scale} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-sm"
              />
            </Document>
            
            {/* Annotation Canvas Layer */}
            <div className="absolute inset-0 z-10">
              <ReactSketchCanvas
                {...({
                  ref: canvasRef,
                  strokeColor: tool === 'highlighter' ? `${strokeColor}44` : strokeColor,
                  strokeWidth: strokeWidth,
                  eraserWidth: strokeWidth * 2,
                  canvasColor: "transparent",
                  className: "w-full h-full pointer-events-auto"
                } as any)}
              />
            </div>
            
            <div className="absolute -top-3 -left-3 z-30 px-2 py-1 bg-primary text-[10px] font-bold text-white rounded shadow-sm flex items-center gap-1">
              <FileText className="w-3 h-3" /> PDF PAGE {pageNumber}
            </div>
          </div>

          {/* Text Notes Panel (Split View) */}
          <AnimatePresence>
            {isSplitView && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="relative bg-card shadow-2xl shrink-0 flex flex-col border border-border p-4 rounded-lg overflow-hidden"
                style={{
                  width: pdfContainerRef.current?.offsetWidth ? pdfContainerRef.current.offsetWidth * 0.9 : 500,
                  height: pdfContainerRef.current?.offsetHeight ? pdfContainerRef.current.offsetHeight : 700,
                  maxWidth: '45%'
                }}
              >
                <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                  <Columns2 className="w-4 h-4 text-neon-blue" />
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Page {pageNumber} Notes</span>
                </div>

                {teacherNotes[pageNumber] && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase">Teacher's Note</span>
                    </div>
                    <p className="text-sm leading-relaxed italic text-foreground/80">
                      {teacherNotes[pageNumber]}
                    </p>
                  </div>
                )}

                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <UserCircle className="w-3 h-3" /> My Private Note
                </div>
                <Textarea
                  value={textNotes[pageNumber] || ""}
                  onChange={(e) => setTextNotes(prev => ({ ...prev, [pageNumber]: e.target.value }))}
                  placeholder={`Type your notes for page ${pageNumber} here...`}
                  className="flex-1 resize-none bg-secondary/20 border-border/50 focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all text-sm leading-relaxed"
                />

                <div className="absolute top-4 right-4 px-2 py-0.5 bg-neon-blue/10 text-[10px] font-bold text-neon-blue rounded uppercase">
                  Shared View
                </div>

                {/* Subtle visual touch */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[100px] -z-10 pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Engagement Question Panel */}
      {showEngagementPanel && sessionId && (
        <QuestionPanel
          sessionId={sessionId}
          onClose={() => setShowEngagementPanel(false)}
          fileName={fileName}
          pageNumber={pageNumber}
        />
      )}

      {showCloseConfirm && (
        <ConfirmDialog
          open={showCloseConfirm}
          onOpenChange={setShowCloseConfirm}
          onConfirm={onClose}
          title="Unsaved Recording"
          description="You have an unsaved recording. Are you sure you want to close the viewer? Your recording will be lost."
          confirmText="Close Anyway"
          cancelText="Stay"
          variant="destructive"
        />
      )}
    </div>
  );
};

export default PdfViewer;
