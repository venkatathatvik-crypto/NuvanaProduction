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
  Eraser as EraserIcon
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

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileId: string;
  fileUrl: string;
  onClose: () => void;
  isReadOnly?: boolean;
  fileName?: string;
  classId?: string;
  sessionId?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ 
  fileId, 
  fileUrl, 
  onClose, 
  isReadOnly = false,
  fileName,
  classId,
  sessionId
}) => {
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
  
  const [isSplitView, setIsSplitView] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [showEngagementPanel, setShowEngagementPanel] = useState(false);

  // Load annotations from backend using React Query
  const { data: fetchedAnnotations = [], isLoading: isLoadingAnnotations, isSuccess } = useQuery({
    queryKey: ['pdf-annotations', fileId],
    queryFn: () => getPdfAnnotations(fileId),
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000,
  });

  // Sync fetched annotations to state when they arrive
  useEffect(() => {
    if (isSuccess) {
      const pdfMap: Record<number, any> = {};
      const notesMap: Record<number, string> = {};
      
      fetchedAnnotations.forEach(ann => {
        if (ann.note_type === 'SCRATCHPAD') {
          // Strictly extract text: handle string or {text: ""}
          if (typeof ann.annotation_data === 'string') {
            notesMap[ann.page_number] = ann.annotation_data;
          } else if (ann.annotation_data?.text) {
            notesMap[ann.page_number] = ann.annotation_data.text;
          }
          // Note: Ignoring legacy object data (drawing paths) for text panel
        } else {
          pdfMap[ann.page_number] = ann.annotation_data;
        }
      });
      
      setPdfAnnotations(prev => ({ ...prev, ...pdfMap }));
      setTextNotes(prev => ({ ...prev, ...notesMap }));
    }
  }, [isSuccess, fetchedAnnotations]);

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
          <Button variant="ghost" size="icon" onClick={onClose}>
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
              Ask Question
            </Button>
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

                <Textarea
                  value={textNotes[pageNumber] || ""}
                  onChange={(e) => setTextNotes(prev => ({ ...prev, [pageNumber]: e.target.value }))}
                  placeholder={`Type your notes for page ${pageNumber} here...`}
                  className="flex-1 resize-none bg-secondary/20 border-border/50 focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all text-sm leading-relaxed"
                />

                <div className="absolute top-4 right-4 px-2 py-0.5 bg-neon-blue/10 text-[10px] font-bold text-neon-blue rounded uppercase">
                  Private
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
    </div>
  );
};

export default PdfViewer;
