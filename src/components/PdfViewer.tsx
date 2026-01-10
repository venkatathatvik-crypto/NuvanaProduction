import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  ChevronLeft, 
  ChevronRight, 
  Pencil, 
  Highlighter, 
  Eraser, 
  RotateCcw, 
  Save, 
  X,
  ZoomIn,
  ZoomOut,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { savePdfAnnotation, getPdfAnnotations } from '@/services/pdfAnnotationService';
import LoadingSpinner from './LoadingSpinner';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileId: string;
  fileUrl: string;
  onClose: () => void;
  isReadOnly?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileId, fileUrl, onClose, isReadOnly = false }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);
  
  const [tool, setTool] = useState<'pencil' | 'highlighter' | 'eraser'>('pencil');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [allAnnotations, setAllAnnotations] = useState<Record<number, any>>({});
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Load annotations from backend
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        setIsLoadingAnnotations(true);
        const data = await getPdfAnnotations(fileId);
        const annotationsMap: Record<number, any> = {};
        data.forEach(ann => {
          annotationsMap[ann.page_number] = ann.annotation_data;
        });
        setAllAnnotations(annotationsMap);
        setInitialDataLoaded(true);
      } catch (error) {
        console.error("Failed to load annotations:", error);
        toast.error("Failed to load annotations.");
      } finally {
        setIsLoadingAnnotations(false);
      }
    };
    loadAnnotations();
  }, [fileId]);

  // Handle page change - save current and load next
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > (numPages || 1)) return;
    
    // Auto-save current page drawing if not read-only
    if (!isReadOnly && canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      if (paths.length > 0) {
        setAllAnnotations(prev => ({ ...prev, [pageNumber]: paths }));
      }
    }
    
    setPageNumber(newPage);
  };

  // When pageNumber or initialDataLoaded changes, load the paths for the new page
  useEffect(() => {
    if (initialDataLoaded && canvasRef.current) {
      const pagePaths = allAnnotations[pageNumber] || [];
      if (pagePaths.length > 0) {
        canvasRef.current.loadPaths(pagePaths);
      } else {
        canvasRef.current.clearCanvas();
      }
    }
  }, [pageNumber, initialDataLoaded, allAnnotations]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleSave = async () => {
    if (isReadOnly || !canvasRef.current) return;
    
    setIsSaving(true);
    try {
      const currentPaths = await canvasRef.current.exportPaths();
      
      // Save current page to DB
      await savePdfAnnotation(fileId, pageNumber, currentPaths);
      
      // Update local state
      setAllAnnotations(prev => ({ ...prev, [pageNumber]: currentPaths }));
      
      toast.success("Annotations saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save annotations.");
    } finally {
      setIsSaving(false);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  const undo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
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
          {!isReadOnly && (
            <Button 
              size="sm" 
              className="neon-glow" 
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
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
        {!isReadOnly && (
          <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4 gap-4 overflow-y-auto">
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
              <Eraser className="w-5 h-5" />
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
        )}

        {/* PDF Rendering Area */}
        <div className="flex-1 overflow-auto bg-muted/30 p-4 flex justify-center items-start">
          <div className="relative shadow-2xl bg-white" style={{ width: 'fit-content' }}>
            {isLoadingAnnotations && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50">
                <LoadingSpinner />
              </div>
            )}
            
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<LoadingSpinner />}
              onLoadError={(error) => {
                console.error("PDF Load Error:", error);
                toast.error("External PDF blocked by CORS. Please ensure storage bucket allows this domain.");
              }}
              error={
                <div className="p-10 text-center space-y-4">
                  <p className="text-destructive font-medium">Failed to load PDF file (CORS Error).</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                    Open in New Tab
                  </Button>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
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
                  readOnly: isReadOnly,
                  className: "w-full h-full pointer-events-auto"
                } as any)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
