// Quiz PDF Export Utility - Optimized and reuses existing PDF infrastructure
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface QuizPDFOptions {
  quizContent: any; // AI response with quiz data
  schoolLogo?: string;
  schoolName?: string;
  subject?: string;
  className?: string;
  teacherName?: string;
  filename?: string;
}

/**
 * Export quiz as PDF with school logo, subject name, and answer key
 * Reuses the professional color scheme and layout from analytics PDF
 */
export async function exportQuizPDF({
  quizContent,
  schoolLogo = "/logo.png",
  schoolName = "School Name",
  subject = "General",
  className = "All Classes",
  teacherName = "Teacher",
  filename = "quiz.pdf",
}: QuizPDFOptions) {
  // Create hidden container for rendering
  const container = document.createElement("div");
  container.id = "quiz-pdf-container";
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1200px;
    background: white;
    padding: 40px;
    font-family: 'Helvetica', 'Arial', sans-serif;
  `;

  // Professional colors (same as analytics PDF)
  const colors = {
    primary: "#1e40af",
    secondary: "#15803d",
    accent: "#ea580c",
    text: "#374151",
    lightGray: "#e5e7eb",
  };

  // Extract quiz data from AI response
  const title = quizContent.title || "Quiz";
  const explanation = quizContent.explanation || "";
  
  // Parse questions and answers from the explanation
  const { questions, answerKey } = parseQuizContent(explanation);

  // Build HTML content
  container.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid ${colors.primary}; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" style="width: 80px; height: 80px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: ${colors.primary};">${schoolName}</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: ${colors.text};">Academic Quiz</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${colors.text};">${className}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <!-- Quiz Info -->
      <div style="background: ${colors.primary}15; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Subject</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${colors.primary};">${subject}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Teacher</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${colors.primary};">${teacherName}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total Questions</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${colors.primary};">${questions.length}</p>
          </div>
        </div>
      </div>

      <!-- Quiz Title -->
      <h2 style="font-size: 24px; font-weight: bold; color: ${colors.primary}; margin: 30px 0 20px 0; border-left: 6px solid ${colors.primary}; padding-left: 15px;">${title}</h2>

      <!-- Instructions -->
      ${quizContent.keyPoints?.length > 0 ? `
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid ${colors.accent};">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: ${colors.text};">Instructions:</p>
          <ul style="margin: 0; padding-left: 20px; color: ${colors.text};">
            ${quizContent.keyPoints.map((point: string) => `<li style="margin-bottom: 5px;">${point}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Questions -->
      <div style="margin-bottom: 40px;">
        ${questions.map((q: any, index: number) => `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <p style="font-size: 16px; font-weight: bold; color: ${colors.text}; margin: 0 0 10px 0;">
              ${index + 1}. ${q.question}
            </p>
            ${q.options ? `
              <div style="margin-left: 20px;">
                ${q.options.map((opt: string, optIndex: number) => `
                  <p style="margin: 5px 0; font-size: 14px; color: ${colors.text};">
                    ${String.fromCharCode(97 + optIndex)}) ${opt}
                  </p>
                `).join('')}
              </div>
            ` : ''}
            ${q.type === 'short' ? `
              <div style="margin: 10px 0 0 20px; border-bottom: 1px solid ${colors.lightGray}; padding-bottom: 30px;"></div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <!-- Answer Key Section -->
      ${answerKey.length > 0 ? `
        <div style="page-break-before: always; margin-top: 40px; padding-top: 30px; border-top: 3px solid ${colors.lightGray};">
          <h3 style="font-size: 20px; font-weight: bold; color: ${colors.secondary}; margin: 0 0 20px 0; border-left: 6px solid ${colors.secondary}; padding-left: 15px;">
            Answer Key
          </h3>
          <div style="background: ${colors.secondary}10; padding: 20px; border-radius: 12px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
              ${answerKey.map((ans: any, index: number) => `
                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid ${colors.lightGray};">
                  <span style="font-weight: bold; color: ${colors.text};">${index + 1}.</span>
                  <span style="color: ${colors.secondary}; font-weight: bold; margin-left: 5px;">${ans}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid ${colors.lightGray}; text-align: center;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #6b7280;">CONFIDENTIAL DOCUMENT • FOR EDUCATIONAL USE ONLY</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ${schoolName} • Generated by Nuvana AI</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Create PDF
    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Calculate image dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= contentHeight;
    }

    // Save PDF
    pdf.save(filename);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Parse quiz content from AI response to extract questions and answers
 * Handles both MCQ and short answer formats
 */
function parseQuizContent(content: string): {
  questions: Array<{ question: string; options?: string[]; type: string }>;
  answerKey: string[];
} {
  const questions: Array<{ question: string; options?: string[]; type: string }> = [];
  const answerKey: string[] = [];

  // Split content into sections
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentQuestion: any = null;
  let inAnswerKey = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we've reached the answer key section
    if (line.toLowerCase().includes('answer key') || line.toLowerCase().includes('answers:')) {
      inAnswerKey = true;
      if (currentQuestion) {
        questions.push(currentQuestion);
        currentQuestion = null;
      }
      continue;
    }

    if (inAnswerKey) {
      // Parse answer key entries (e.g., "1. A" or "1) A" or "1: A")
      const answerMatch = line.match(/^\d+[\.\):\s]+([A-Da-d]|.+)$/);
      if (answerMatch) {
        answerKey.push(answerMatch[1].trim().toUpperCase());
      }
    } else {
      // Parse questions (e.g., "1. What is..." or "Q1:" or "**1.**")
      const questionMatch = line.match(/^[\*\s]*(\d+)[\.\)\:\*\s]+(.+)$/);
      if (questionMatch) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: questionMatch[2].replace(/\*\*/g, '').trim(),
          options: [],
          type: 'mcq',
        };
      }
      // Parse options (e.g., "a) Option" or "A. Option")
      else if (currentQuestion && /^[a-dA-D][\.\)]\s+/.test(line)) {
        const option = line.replace(/^[a-dA-D][\.\)]\s+/, '').replace(/\*\*/g, '').trim();
        currentQuestion.options.push(option);
      }
      // If no options found after question, it's likely a short answer
      else if (currentQuestion && currentQuestion.options.length === 0 && i > 0) {
        currentQuestion.type = 'short';
      }
    }
  }

  // Add last question if exists
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // If no questions were parsed, create a fallback
  if (questions.length === 0) {
    questions.push({
      question: content,
      type: 'short',
    });
  }

  return { questions, answerKey };
}
