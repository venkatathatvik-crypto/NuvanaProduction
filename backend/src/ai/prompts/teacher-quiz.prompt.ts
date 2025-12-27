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
  difficulty?: string,
  ragContext?: string
) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  
  // If question count is not specified, ask for it
  if (!questionCount) {
    return `TASK: Help teacher create a quiz/test on "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
STYLE: ${classBandStyle}

${ragContext && ragContext !== '[NO RELEVANT CONTENT FOUND]' ? `\nCONTENT SOURCE:\nI have access to the educational materials you've provided for this subject. I will generate questions based on these materials.\n` : `\nNOTE: No specific materials were found for this topic. I will generate general academic questions based on standard curriculum.\n`}

## 📝 Quiz Creation: Let's Get Started!

To generate the best quiz for your students, I just need two quick details:

1. **How many questions** would you like? (e.g., 10, 15, 20)
2. **What type of questions?** (e.g., MCQ only, Short Answer, or a **Mixed Type**)

**Just reply with something like:**
"15 questions, mixed type"

Once you provide these, I'll generate the full quiz with an answer key and marking rubric for you!`;
  }

  // Calculate question distribution
  const mcqCount = (questionTypes?.toLowerCase().includes('mcq') || !questionTypes || questionTypes?.toLowerCase().includes('mix')) ? Math.floor(questionCount * 0.6) : 0;
  const saCount = (questionTypes?.toLowerCase().includes('short') || !questionTypes || questionTypes?.toLowerCase().includes('mix')) ? Math.floor(questionCount * 0.3) : 0;
  const essayCount = questionCount - mcqCount - saCount;

  // If all details provided, generate the quiz
  return `TASK: Generate a comprehensive quiz/test for teachers on "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
QUESTION COUNT: ${questionCount}
QUESTION TYPES: ${questionTypes || 'Mixed'}
DIFFICULTY: ${difficulty || 'Medium'}
STYLE: ${classBandStyle}

${ragContext && ragContext !== '[NO RELEVANT CONTENT FOUND]' ? `EDUCATIONAL CONTENT FOR QUESTION GENERATION:
${ragContext}

IMPORTANT: Generate questions DIRECTLY from the above educational content. Extract key concepts, facts, definitions, examples, and problem-solving approaches from the provided material. Questions should test understanding of THIS specific content.
` : 'NOTE: Generate general knowledge questions on this topic as no specific educational materials were provided.\n'}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure using ### headers with emojis
2. **Detailed Content** - You MUST generate EXACTLY ${questionCount} actual questions. Do NOT just describe them.
3. **No HTML Tags** - Pure Markdown only.
4. **Include Answer Key** - Separated section at the end.
5. **Ready to Use** - Format for easy copy to test creation system.

RESPONSE STRUCTURE (Strictly follow this with ### headers):

### Title
${topic}: ${questionCount}-Question ${difficulty} Quiz

### Explanation
Below is the complete quiz designed for ${classBand} students. It includes ${questionCount} questions with a full answer key and marking rubric.

### Detailed Content

### 📋 Quiz Overview
**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Total Questions:** ${questionCount}
**Question Types:** ${questionTypes || 'Mixed'}
**Difficulty:** ${difficulty || 'Medium'}
**Total Marks:** ${mcqCount * 2 + saCount * 3 + essayCount * 5}
**Suggested Duration:** ${mcqCount + saCount * 4 + essayCount * 12} minutes

### 📝 Multiple Choice Questions (${mcqCount} questions)

${mcqCount > 0 ? `Generate EXACTLY ${mcqCount} MCQ questions numbered 1 to ${mcqCount}.

EACH question MUST have:
- Clear question text
- 4 options labeled A), B), C), D)
- Mark value [2 marks]

FORMAT for EACH question:
**1. [Your actual question text here?]** [2 marks]
A) First option
B) Second option
C) Third option
D) Fourth option

GENERATE ALL ${mcqCount} MCQ QUESTIONS NOW.` : '(No MCQ questions requested)'}

### ✍️ Short Answer Questions (${saCount} questions)

${saCount > 0 ? `Generate EXACTLY ${saCount} short answer questions numbered ${mcqCount + 1} to ${mcqCount + saCount}.

EACH question MUST have:
- Clear question text
- Word limit (50-100 words)
- Mark value [3 marks]

FORMAT for EACH question:
**${mcqCount + 1}. [Your actual question text here?]** [3 marks]
*(Answer in 50-100 words)*

GENERATE ALL ${saCount} SHORT ANSWER QUESTIONS NOW.` : '(No short answer questions requested)'}

### 📖 Essay/Long Answer Questions (${essayCount} questions)

${essayCount > 0 ? `Generate EXACTLY ${essayCount} essay questions numbered ${mcqCount + saCount + 1} to ${questionCount}.

EACH question MUST have:
- Clear question text
- Word limit (200-300 words)
- Mark value [5 marks]

FORMAT for EACH question:
**${mcqCount + saCount + 1}. [Your actual question text here?]** [5 marks]
*(Write a detailed answer in 200-300 words)*

GENERATE ALL ${essayCount} ESSAY QUESTIONS NOW.` : '(No essay questions requested)'}

### ✅ Answer Key

### MCQ Answers (${mcqCount} answers)
${mcqCount > 0 ? `Provide answers for questions 1-${mcqCount}:
1. **Answer:** [Correct option] - [Brief explanation]
2. **Answer:** [Correct option] - [Brief explanation]
(Continue for all ${mcqCount} MCQs)` : '(No MCQ answers)'}

### Short Answer Model Answers (${saCount} answers)
${saCount > 0 ? `Provide model answers for questions ${mcqCount + 1}-${mcqCount + saCount}:
**Question ${mcqCount + 1}:**
- Key point 1
- Key point 2
- Key point 3
**Marking:** Award 1 mark per key point (Total: 3 marks)

(Continue for all ${saCount} short answers)` : '(No short answer keys)'}

### Essay Answer Rubrics (${essayCount} rubrics)
${essayCount > 0 ? `Provide rubrics for questions ${mcqCount + saCount + 1}-${questionCount}:
**Question ${mcqCount + saCount + 1} (5 marks):**
- Content accuracy: 2 marks
- Organization: 1 mark
- Examples provided: 1 mark
- Depth: 1 mark

(Continue for all ${essayCount} essays)` : '(No essay rubrics)'}

### 💡 Teacher Notes

**Total Marks:** ${mcqCount * 2 + saCount * 3 + essayCount * 5} marks
**Suggested Duration:** ${mcqCount + saCount * 4 + essayCount * 12} minutes

**Time Allocation:**
- MCQ: 1 minute per question
- Short Answer: 4 minutes per question
- Essay: 12 minutes per question

**Marking Guidelines:**
- MCQ: ${mcqCount > 0 ? '2 marks each (no partial credit)' : 'N/A'}
- Short Answer: ${saCount > 0 ? '3 marks each (partial credit possible)' : 'N/A'}
- Essay: ${essayCount > 0 ? '5 marks each (use rubric above)' : 'N/A'}

FORMATTING REQUIREMENTS:
- You MUST generate EXACTLY ${questionCount} actual questions with all options/details
- Do NOT just describe what questions should be like - CREATE THEM
- Number all questions clearly (1, 2, 3...)
- For MCQ: Provide all 4 options for EACH question
- Include complete answer key with all correct answers
- Make questions directly relevant to "${topic}"
- Age-appropriate for ${classBand} students
- ${classBand === 'primary' ? 'Use simple language, concrete examples' : classBand === 'middle' ? 'Balance concrete and abstract concepts' : 'Use academic language, deeper analysis'}`;
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
