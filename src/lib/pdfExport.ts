// Utility for exporting Analytics page as PDF with watermark, A4 margins, and neat alignment
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportOptions {
  elementId?: string;
  logoUrl?: string;
  schoolName?: string;
  watermarkOpacity?: number;
  watermarkWidth?: number;
  watermarkHeight?: number;
  marginMm?: number;
  filename?: string;
}

export async function exportAnalyticsPDF({
  elementId = "analytics-pdf-root",
  logoUrl = "/logo.png",
  schoolName = "Nuvana Academy",
  watermarkOpacity = 0.05,
  watermarkWidth = 100,
  watermarkHeight = 100,
  marginMm = 20,
  filename = "analytics-report.pdf",
}: ExportOptions = {}) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Analytics root element not found");

  // Make element visible temporarily for rendering
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.left = '-9999px'; // Move off-screen but keep visible for rendering
  
  // Wait longer for charts to render (Recharts needs time)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Render the element to canvas with improved settings for charts
  const canvas = await html2canvas(element, {
    scale: 3, // Increased from 2 for better quality
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    foreignObjectRendering: true, // Better SVG rendering
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.backgroundColor = "#ffffff";
        clonedElement.style.padding = "20px";
        clonedElement.style.display = 'block';
        const hiddenElements = clonedElement.querySelectorAll('.print\\:hidden');
        hiddenElements.forEach(el => (el as HTMLElement).style.display = 'none');
        
        // Ensure all SVG elements are visible
        const svgElements = clonedElement.querySelectorAll('svg');
        svgElements.forEach(svg => {
          (svg as SVGElement).style.backgroundColor = 'transparent';
        });
      }
    }
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const innerWidth = pageWidth - (marginMm * 2);
  const innerHeight = pageHeight - (marginMm * 4); // Extra space for header/footer

  const logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
    if (!logoUrl) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoUrl;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  const addPageHeader = (doc: jsPDF) => {
    // School Logo (larger and more prominent)
    if (logoImage) {
      const iconW = 15; // Increased from 8mm to 15mm
      const iconH = (logoImage.height * iconW) / logoImage.width;
      doc.addImage(logoImage, "PNG", marginMm, marginMm - 12, iconW, iconH);
    }

    // School Name (larger and bold)
    doc.setFontSize(12); // Increased from 8 to 12
    doc.setTextColor(30, 64, 175); // Professional blue color (#1e40af)
    doc.setFont("helvetica", "bold"); // Changed to bold
    
    if (schoolName) {
      const xPos = logoImage ? marginMm + 18 : marginMm; // Position next to logo
      doc.text(schoolName.toUpperCase(), xPos, marginMm - 6);
    }

    // Separator line (thicker and darker)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(marginMm, marginMm - 2, pageWidth - marginMm, marginMm - 2);
  };

  const addPageWatermark = (doc: jsPDF) => {
    if (!logoImage) return;
    const w = watermarkWidth;
    const h = (logoImage.height * w) / logoImage.width;
    const x = (pageWidth - w) / 2;
    const y = (pageHeight - h) / 2;
    const gState = new (doc as any).GState({ opacity: watermarkOpacity });
    doc.saveGraphicsState();
    doc.setGState(gState);
    doc.addImage(logoImage, "PNG", x, y, w, h);
    doc.restoreGraphicsState();
  };

  let currentY = 0;
  const totalHeight = canvas.height;
  const canvasPageHeight = (canvas.width * innerHeight) / innerWidth;

  while (currentY < totalHeight) {
    if (currentY > 0) {
      pdf.addPage();
    }

    addPageHeader(pdf);
    addPageWatermark(pdf);

    pdf.setDrawColor(240, 240, 240);
    pdf.rect(marginMm - 1, marginMm - 1, innerWidth + 2, innerHeight + 2);

    const sectionHeight = Math.min(canvasPageHeight, totalHeight - currentY);
    const sectionCanvas = document.createElement('canvas');
    sectionCanvas.width = canvas.width;
    sectionCanvas.height = sectionHeight;
    const ctx = sectionCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, currentY, canvas.width, sectionHeight, 0, 0, canvas.width, sectionHeight);
      const sectionData = sectionCanvas.toDataURL("image/jpeg", 0.95);
      const displayHeight = (sectionHeight * innerWidth) / canvas.width;
      pdf.addImage(sectionData, "JPEG", marginMm, marginMm, innerWidth, displayHeight);
    }

    currentY += canvasPageHeight;
    
    pdf.setFontSize(7);
    pdf.setTextColor(180, 180, 180);
    const pageNumText = `Page ${pdf.getNumberOfPages()} | Generated by Nuvana Analytics`;
    pdf.text(pageNumText, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  pdf.save(filename);
  
  // Reset element styles
  element.style.display = 'none';
  element.style.position = '';
  element.style.left = '';
}
