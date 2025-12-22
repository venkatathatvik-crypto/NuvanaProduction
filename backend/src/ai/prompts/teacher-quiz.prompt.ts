import { ClassBandStyles } from './classband.styles';

/**
 * Teacher Quiz/Test Creation Prompt
 * Enhanced to ask for question count and preferences before generating
 */
export const TeacherQuizPrompt = (
  topic: string,
  subject: string,
  classBand: string,
  questionCount?: number,
  questionTypes?: string,
  difficulty?: string
) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  
  // If question count is not specified, ask for it
  if (!questionCount) {
    return `TASK: Help teacher create a quiz/test on "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
STYLE: ${classBandStyle}

## 📝 Quiz Creation Setup

Before I generate your quiz, I need a few details:

**Required Information:**
1. **How many questions?** (e.g., 10, 15, 20, 30)
2. **Question types?** (Choose one or mix)
   - MCQ (Multiple Choice Questions)
   - Short Answer
   - Essay/Long Answer
   - Mix of all types

3. **Difficulty level?** (Choose one)
   - Easy
   - Medium
   - Hard
   - Mixed

**Example Response:**
"15 questions, mostly MCQ with some short answers, medium difficulty"

**Please provide these details, and I'll generate a comprehensive quiz for you!**`;
  }

  // If all details provided, generate the quiz
  return `TASK: Generate a comprehensive quiz/test for teachers on "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
QUESTION COUNT: ${questionCount}
QUESTION TYPES: ${questionTypes || 'Mixed'}
DIFFICULTY: ${difficulty || 'Medium'}
STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 📝 Section Title
3. **No HTML Tags** - Pure Markdown only
4. **Generate EXACTLY ${questionCount} questions** - No more, no less
5. **Include Answer Key** - Separated section at the end
6. **Ready to Use** - Format for easy copy to test creation system
7. **Marks Allocation** - Suggest marks for each question
8. **Time Estimates** - Suggested time per question

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📋 Quiz Overview

**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Total Questions:** ${questionCount}
**Question Types:** ${questionTypes || 'Mixed'}
**Difficulty:** ${difficulty || 'Medium'}
**Total Marks:** [Calculate based on questions]
**Suggested Duration:** [Calculate based on question count and types]

## 📝 Section A: Multiple Choice Questions

${generateMCQSection(questionCount, questionTypes)}

## ✍️ Section B: Short Answer Questions

${generateShortAnswerSection(questionCount, questionTypes)}

## 📖 Section C: Long Answer/Essay Questions

${generateEssaySection(questionCount, questionTypes)}

## ✅ Answer Key

### Multiple Choice Answers
1. **Question 1:** Option [X] - [Brief explanation why]
2. **Question 2:** Option [X] - [Brief explanation why]

### Short Answer Key Points
1. **Question [N]:** 
   - Key point 1
   - Key point 2
   - Key point 3
   - **Marking:** Award 1 mark for each point (Total: X marks)

### Essay/Long Answer Rubric
1. **Question [N] (X marks):**
   - Content accuracy: [Points]
   - Organization/Structure: [Points]
   - Examples provided: [Points]
   - Depth of understanding: [Points]

## 💡 Teacher Notes

**Marking Guidelines:**
- MCQ: 1-2 marks each (no partial credit)
- Short Answer: 2-3 marks each (partial credit possible)
- Essay Questions: 5-10 marks each (use rubric)

**Time Allocation:**
- MCQ: 1 minute per question
- Short Answer: 3-5 minutes per question
- Essay: 10-15 minutes per question

**Difficulty Distribution:**
- Easy: 30% (foundation level)
- Medium: 50% (application level)
- Hard: 20% (analysis/synthesis level)

**Common Mistakes to Watch For:**
[List common student errors for this topic]

## 📊 Question Bank Format (CSV Ready)

\`\`\`csv
Question Number,Question Text,Type,Marks,Correct Answer,Option A,Option B,Option C,Option D
1,"[Question text]",MCQ,2,"A","Option text","Option text","Option text","Option text"
2,"[Question text]",Short_Answer,3,"[Key points]","","","",""
\`\`\`

**Note:** Copy this CSV format to import into your test creation system

FORMATTING REQUIREMENTS:
- Generate EXACTLY ${questionCount} questions (no more, no less)
- Use ## headers with emojis for ALL sections
- Number all questions clearly (1, 2, 3...)
- For MCQ: Provide 4 options (A, B, C, D)
- For Short Answer: Suggest word limit (50-100 words)
- For Essay: Suggest word limit (200-300 words)
- Mark allocation must be clear for each question
- Include detailed answer key
- Provide CSV format for easy import
- NO HTML TAGS - pure Markdown only

QUESTION TYPE DISTRIBUTION:
${getQuestionTypeDistribution(questionCount, questionTypes)}

AGE-APPROPRIATE CONTENT:
- ${classBand === 'primary' ? 'Use simple language, concrete examples, visual descriptions' : ''}
- ${classBand === 'middle' ? 'Balance concrete and abstract, real-world applications' : ''}
- ${classBand === 'high' ? 'Academic language, critical thinking, analysis and synthesis' : ''}
`;

  // Helper function placeholders (LLM will interpret these)
  function generateMCQSection(count: number, types: string | undefined) {
    const mcqCount = calculateMCQCount(count, types);
    if (mcqCount === 0) return '[No MCQ questions requested]';
    return `[Generate ${mcqCount} MCQ questions with 4 options each]`;
  }

  function generateShortAnswerSection(count: number, types: string | undefined) {
    const saCount = calculateShortAnswerCount(count, types);
    if (saCount === 0) return '[No short answer questions requested]';
    return `[Generate ${saCount} short answer questions]`;
  }

  function generateEssaySection(count: number, types: string | undefined) {
    const essayCount = calculateEssayCount(count, types);
    if (essayCount === 0) return '[No essay questions requested]';
    return `[Generate ${essayCount} essay/long answer questions]`;
  }

  function calculateMCQCount(total: number, types: string | undefined): number {
    if (!types || types.toLowerCase().includes('mcq') || types.toLowerCase().includes('mix')) {
      return Math.floor(total * 0.6); // 60% MCQ in mixed
    }
    return 0;
  }

  function calculateShortAnswerCount(total: number, types: string | undefined): number {
    if (!types || types.toLowerCase().includes('short') || types.toLowerCase().includes('mix')) {
      return Math.floor(total * 0.3); // 30% short answer in mixed
    }
    return 0;
  }

  function calculateEssayCount(total: number, types: string | undefined): number {
    if (!types || types.toLowerCase().includes('essay') || types.toLowerCase().includes('long') || types.toLowerCase().includes('mix')) {
      return Math.floor(total * 0.1); // 10% essay in mixed
    }
    return 0;
  }

  function getQuestionTypeDistribution(total: number, types: string | undefined): string {
    const mcq = calculateMCQCount(total, types);
    const sa = calculateShortAnswerCount(total, types);
    const essay = calculateEssayCount(total, types);
    
    return `- MCQ: ${mcq} questions
- Short Answer: ${sa} questions  
- Essay/Long Answer: ${essay} questions
- **Total: ${total} questions**`;
  }
};

/**
 * Legacy MockTest prompt - now redirects to teacher quiz
 */
export const MockTestPrompt = (topics: string[], difficulty: string, duration: string, classBand: string) => {
  return TeacherQuizPrompt(
    topics.join(', '),
    'General',
    classBand,
    undefined, // Will ask for question count
    undefined,
    difficulty
  );
};
