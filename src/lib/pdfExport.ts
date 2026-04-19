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
  logoUrl = `${import.meta.env.BASE_URL}logo.png`,
  schoolName = "Nuvana Academy",
  watermarkOpacity = 0.05,
  watermarkWidth = 100,
  marginMm = 15, // Slightly reduced margins for more data space
  filename = "analytics-report.pdf",
}: ExportOptions = {}) {
  const rootElement = document.getElementById(elementId);
  if (!rootElement) throw new Error("Analytics root element not found");

  // Temporarily show the root for measurement
  rootElement.style.display = 'block';
  rootElement.style.position = 'fixed';
  rootElement.style.left = '-9999px';
  rootElement.style.top = '0';
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  const sections = rootElement.querySelectorAll('[data-pdf-section="true"]');
  
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const innerWidth = pageWidth - (marginMm * 2);
  const headerHeight = 25;
  const footerHeight = 15;
  const contentStartY = marginMm + headerHeight;
  const contentMaxHeight = pageHeight - (marginMm * 2) - headerHeight - footerHeight;

  let currentY = contentStartY;

  const logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
    if (!logoUrl) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoUrl;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  const drawHeadersAndFooters = (doc: jsPDF) => {
    // Header
    if (logoImage) {
      const iconW = 12;
      const iconH = (logoImage.height * iconW) / logoImage.width;
      doc.addImage(logoImage, "PNG", marginMm, marginMm, iconW, iconH);
    }
    
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName.toUpperCase(), marginMm + 15, marginMm + 6);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("PROFESSIONAL ACADEMIC ANALYTICS REPORT", marginMm + 15, marginMm + 11);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginMm, marginMm + 15, pageWidth - marginMm, marginMm + 15);

    // Footer
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${pageNum} | Nuvana AI Intelligence Architecture`, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    // Watermark
    if (logoImage) {
      const w = 60;
      const h = (logoImage.height * w) / logoImage.width;
      const x = (pageWidth - w) / 2;
      const y = (pageHeight - h) / 2;
      
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: watermarkOpacity });
      doc.setGState(gState);
      doc.addImage(logoImage, "PNG", x, y, w, h);
      doc.restoreGraphicsState();
    }
  };

  // Pre-draw first page header
  drawHeadersAndFooters(pdf);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as HTMLElement;
    
    // Capture section
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgWidth = innerWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if section fits on current page
    if (currentY + imgHeight > contentStartY + contentMaxHeight) {
      pdf.addPage();
      drawHeadersAndFooters(pdf);
      currentY = contentStartY;
    }

    // Add image to PDF
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", marginMm, currentY, imgWidth, imgHeight);
    
    currentY += imgHeight + 5; // Add spacing between sections
  }

  pdf.save(filename);
  
  rootElement.style.display = 'none';
  rootElement.style.position = '';
  rootElement.style.left = '';
  rootElement.style.top = '';
}
