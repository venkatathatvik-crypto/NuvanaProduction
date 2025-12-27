import { ClassBandStyles } from './classband.styles';

/**
 * Teacher Grade Paper Prompt
 * AI-powered grading with detailed feedback and rubric-based assessment
 */
export const TeacherGradePaperPrompt = (
  paperContent: string,
  subject: string,
  classBand: string,
  totalMarks?: number,
  paperType?: 'Essay' | 'Short_Answer' | 'Problem_Solving' | 'Creative_Writing' | 'General',
  gradingCriteria?: string
) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  const maxMarks = totalMarks || 20; // Default 20 marks
  const type = paperType || 'General';

  return `TASK: Grade a student's paper submission with comprehensive feedback and marks

PAPER DETAILS:
SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
PAPER TYPE: ${type}
TOTAL MARKS: ${maxMarks}
GRADING CRITERIA: ${gradingCriteria || 'Standard academic rubric'}
AUDIENCE STYLE: ${classBandStyle}

STUDENT SUBMISSION:
${paperContent}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your grading using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 📊 Section Title
3. **No HTML Tags** - Use pure Markdown only
4. **Fair and Constructive** - Balance critical feedback with encouragement
5. **Specific Examples** - Reference specific parts of the student's work
6. **Age-Appropriate** - Adjust feedback complexity for the grade level
7. **Actionable Advice** - Provide concrete steps for improvement
8. **Marks Breakdown** - Show detailed allocation based on rubric

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📊 Grading Summary

**Student Performance:** [Excellent / Very Good / Good / Satisfactory / Needs Improvement]
**Marks Awarded:** ${type === 'Essay' || type === 'Creative_Writing' ? `**__/${maxMarks}**` : `**__/${maxMarks}**`}
**Grade:** [Letter grade if applicable: A+/A/B+/B/C+/C/D/F]
**Completion:** [Percentage complete: __%]

---

## 🎯 Marks Breakdown

**Based on paper type "${type}", distribute marks as follows:**

${type === 'Essay' ? `
**Content & Understanding:** __/${Math.floor(maxMarks * 0.35)} marks (35%)
- Depth of understanding
- Relevance to topic
- Use of examples

**Structure & Organization:** __/${Math.floor(maxMarks * 0.25)} marks (25%)
- Clear introduction and conclusion
- Logical flow of ideas
- Paragraph structure

**Language & Expression:** __/${Math.floor(maxMarks * 0.25)} marks (25%)
- Grammar and spelling
- Vocabulary usage
- Clarity of expression

**Critical Thinking:** __/${Math.floor(maxMarks * 0.15)} marks (15%)
- Original ideas
- Analysis and evaluation
- Supporting arguments` : ''}

${type === 'Short_Answer' ? `
**Accuracy:** __/${Math.floor(maxMarks * 0.50)} marks (50%)
- Correct information
- Relevance to question

**Completeness:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- All key points covered
- Sufficient detail

**Clarity:** __/${Math.floor(maxMarks * 0.20)} marks (20%)
- Clear expression
- Well-organized response` : ''}

${type === 'Problem_Solving' ? `
**Understanding:** __/${Math.floor(maxMarks * 0.25)} marks (25%)
- Problem comprehension
- Approach selection

**Method/Process:** __/${Math.floor(maxMarks * 0.35)} marks (35%)
- Correct methodology
- Logical steps shown
- Work clearly presented

**Accuracy:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- Calculation accuracy
- Final answer correctness

**Explanation:** __/${Math.floor(maxMarks * 0.10)} marks (10%)
- Reasoning explained
- Conclusions justified` : ''}

${type === 'Creative_Writing' ? `
**Creativity & Originality:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- Unique ideas
- Imaginative content

**Narrative/Expression:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- Story development/flow
- Engaging writing style

**Language & Mechanics:** __/${Math.floor(maxMarks * 0.25)} marks (25%)
- Grammar and spelling
- Vocabulary richness

**Structure:** __/${Math.floor(maxMarks * 0.15)} marks (15%)
- Organization
- Coherence` : ''}

${type === 'General' ? `
**Content Quality:** __/${Math.floor(maxMarks * 0.40)} marks (40%)
- Understanding of topic
- Accuracy of information

**Presentation:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- Organization
- Clarity of expression

**Completeness:** __/${Math.floor(maxMarks * 0.30)} marks (30%)
- All requirements met
- Sufficient detail` : ''}

**Total:** **__/${maxMarks}** marks

---

## 💪 Strengths

Highlight what the student did well:
1. **[Specific strength]** - [Brief explanation with example from their work]
2. **[Specific strength]** - [Brief explanation with example from their work]
3. **[Specific strength]** - [Brief explanation with example from their work]

---

## 🔍 Areas for Improvement

Constructive feedback on what needs work:
1. **[Area to improve]** - [Specific issue and why it matters]
   - **How to improve:** [Actionable advice]
2. **[Area to improve]** - [Specific issue and why it matters]
   - **How to improve:** [Actionable advice]
3. **[Area to improve]** - [Specific issue and why it matters]
   - **How to improve:** [Actionable advice]

---

## 📝 Detailed Feedback

${type === 'Essay' ? `
**Introduction:**
[Comment on how well the student introduced the topic]

**Body Content:**
[Assess the main arguments and supporting evidence]

**Conclusion:**
[Evaluate how well the essay was concluded]

**Overall Flow:**
[Comment on coherence and transitions]` : ''}

${type === 'Short_Answer' ? `
**Key Points Covered:**
- [Point 1]: [Assessment]
- [Point 2]: [Assessment]
- [Point 3]: [Assessment]

**Clarity & Conciseness:**
[Comment on how well the answer was expressed]` : ''}

${type === 'Problem_Solving' ? `
**Problem Understanding:**
[Did the student understand what was being asked?]

**Solution Method:**
[Was the approach correct? Were steps logical?]

**Calculations:**
[Were calculations accurate? Any errors?]

**Final Answer:**
[Is the final answer correct? Properly presented?]` : ''}

${type === 'Creative_Writing' ? `
**Story/Concept:**
[Comment on the central idea or story]

**Character/Description:**
[Assess characterization or descriptive elements]

**Writing Style:**
[Comment on the student's unique voice and style]

**Impact:**
[How engaging or effective was the piece?]` : ''}

${type === 'General' ? `
**Main Content:**
[Assess the core substance of the submission]

**Presentation:**
[Comment on how well it was presented]

**Requirements:**
[Did it meet all the assignment requirements?]` : ''}

---

## 💡 Teacher's Comments

**Overall Assessment:**
[2-3 sentences summarizing the student's performance and progress]

**Specific Highlights:**
- [Quote or reference specific excellent part]
- [Quote or reference area that needs attention]

**Next Steps:**
[Concrete action items for the student to improve]

---

## 📚 Resources for Improvement

**Recommended Focus Areas:**
- [Topic/skill 1] - [Why this matters]
- [Topic/skill 2] - [Why this matters]

**Practice Suggestions:**
- [Specific exercise or activity]
- [Specific exercise or activity]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for important points and marks
- Use bullet points for lists
- Include specific quotes or references from student's work
- Be encouraging while being honest
- Award marks fairly based on actual content quality
- Provide constructive, actionable feedback
- NO HTML TAGS - pure Markdown only

GRADING PHILOSOPHY:
- ${classBand === 'primary' ? 'Focus on effort and progress, be very encouraging, use simple language' : ''}
- ${classBand === 'middle' ? 'Balance encouragement with constructive criticism, use clear examples' : ''}
- ${classBand === 'high' ? 'Provide detailed analytical feedback, academic rigor, prepare for higher education standards' : ''}

IMPORTANT NOTES:
- If the paper content seems incomplete or unclear, note this in feedback
- If handwriting is mentioned as unclear, acknowledge this
- Always find at least 2-3 genuine positive aspects
- Be specific - avoid generic feedback like "good job" or "needs work"
- Reference actual content from the student's submission
- Suggest realistic, achievable improvements
- Award full marks only for exceptional work
- Give partial marks for good attempts with room for improvement`;
};


