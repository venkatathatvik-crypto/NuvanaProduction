import { ClassBandStyles } from './classband.styles';
import { QuickReplyButton } from '../dto/ai-response.dto';

/**
 * Teacher Quiz Quick Reply Generator
 * Returns button options for step-by-step quiz parameter collection
 */
export const TeacherQuizQuickReply = (
  topic: string,
  subject: string,
  classBand: string,
  questionCount?: number,
  questionTypes?: string,
  difficulty?: string,
  ragContext?: string
): { message: string; quickReplies: QuickReplyButton[]; inputType: string; waitingForInput: boolean } | null => {
  
  // Step 1: Ask for question count
  if (!questionCount) {
    return {
      message: `🎯 **Let's create your quiz on "${topic}"!**

${ragContext && ragContext !== '[NO RELEVANT CONTENT FOUND]' 
  ? '📚 I have access to your uploaded materials and will generate questions from them.\n' 
  : '📝 I will generate general academic questions based on standard curriculum.\n'}

**First, how many questions would you like?**

💡 *Tip: 10-15 for a quick quiz, 20-30 for a comprehensive test*`,
      quickReplies: [
        { text: '10 Questions', value: 10, icon: '📝' },
        { text: '15 Questions', value: 15, icon: '📝', recommended: true },
        { text: '20 Questions', value: 20, icon: '📝' },
        { text: '30 Questions', value: 30, icon: '📄' }
      ],
      inputType: 'questionCount',
      waitingForInput: true
    };
  }
  
  // Step 2: Ask for question type
  if (!questionTypes) {
    return {
      message: `Great! **${questionCount} questions** it is. ✅

**Now, what type of questions would you like?**`,
      quickReplies: [
        { text: '📝 MCQ Only', value: 'mcq', icon: '📝' },
        { text: '✍️ Short Answer Only', value: 'short', icon: '✍️' },
        { text: '📄 Essay Only', value: 'essay', icon: '📄' },
        { text: '🎯 Mixed Types', value: 'mixed', icon: '🎯', recommended: true }
      ],
      inputType: 'questionTypes',
      waitingForInput: true
    };
  }
  
  // Step 3: Ask for difficulty
  if (!difficulty) {
    return {
      message: `Perfect! **${questionTypes}** questions selected. ✅

**Finally, choose the difficulty level:**`,
      quickReplies: [
        { text: '🟢 Easy', value: 'easy', icon: '🟢' },
        { text: '🟡 Medium', value: 'medium', icon: '🟡', recommended: true },
        { text: '🔴 Hard', value: 'hard', icon: '🔴' }
      ],
      inputType: 'difficulty',
      waitingForInput: true
    };
  }
  
  // All parameters collected - no quick replies needed
  return null;
};

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
  ragContext?: string,
  previousQuestions?: string[] // Phase 3: For deduplication
) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  
  // Step 1: If question count is not specified, ask for it
  if (!questionCount) {
    return `TASK: Help teacher create a quiz/test on "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
STYLE: ${classBandStyle}

${ragContext && ragContext !== '[NO RELEVANT CONTENT FOUND]' ? `\n📚 **CONTENT SOURCE:**\nI have access to the educational materials you've provided for this subject. I will generate questions based on these materials.\n` : `\n📝 **NOTE:** No specific materials were found for this topic. I will generate general academic questions based on standard curriculum.\n`}

## 🎯 Quiz Creation: Let's Get Started!

To generate the perfect quiz for your students, I need a few details. Let's start with:

**1. How many questions would you like?**
   - Suggested: 10-15 for a quick quiz, 20-30 for a full test
   - Examples: "10 questions", "15", "20 questions"

**2. What type of questions?**
   - **MCQ only** - Multiple choice questions
   - **Short Answer** - Brief written responses
   - **Essay** - Detailed written responses
   - **Mixed** - Combination of all types (recommended)
   - Examples: "mixed type", "MCQ only", "short answer and MCQ"

**3. Difficulty level?** (optional)
   - **Easy** - Basic recall and understanding
   - **Medium** - Application and analysis (default)
   - **Hard** - Complex problem-solving and evaluation
   - Examples: "medium difficulty", "hard", "easy"

**Just reply with something like:**
- "15 questions, mixed type, medium difficulty"
- "10 MCQ questions, easy"
- "20 questions, mixed" (I'll use medium difficulty by default)

Once you provide these details, I'll generate the complete quiz with answer key and marking rubric! 📋✨`;
  }

  // Step 2: If difficulty is not specified, ask for it (optional - can proceed with default)
  if (!difficulty) {
    // Don't block generation - just use Medium as default
    // This makes it truly conversational - teacher can specify or skip
    difficulty = 'Medium';
  }

  // Calculate question distribution based on type
  let mcqCount = 0;
  let saCount = 0;
  let essayCount = 0;

  const type = questionTypes?.toLowerCase() || 'mixed';
  const isMixed = type.includes('mix') || (!type.includes('mcq') && !type.includes('short') && !type.includes('essay'));

  if (isMixed) {
    // Mixed distribution: 60/30/10
    mcqCount = Math.floor(questionCount * 0.6);
    saCount = Math.floor(questionCount * 0.3);
    essayCount = questionCount - mcqCount - saCount;
  } else {
    // Single type requested
    if (type.includes('mcq')) mcqCount = questionCount;
    else if (type.includes('short')) saCount = questionCount;
    else if (type.includes('essay')) essayCount = questionCount;
    else {
      // Fallback to mixed if unknown
      mcqCount = Math.floor(questionCount * 0.6);
      saCount = Math.floor(questionCount * 0.3);
      essayCount = questionCount - mcqCount - saCount;
    }
  }

  const isMcqOnly = mcqCount === questionCount && questionCount > 0;
  const isSaOnly = saCount === questionCount && questionCount > 0;
  const isEssayOnly = essayCount === questionCount && questionCount > 0;


  // Add previous questions warning if available (Phase 3: Deduplication)
  // OPTIMIZED: Show only first 5 questions with truncated text to reduce prompt size
  const uniquenessWarning = previousQuestions && previousQuestions.length > 0 ? `
⚠️ **CRITICAL: AVOID PREVIOUS QUESTIONS**

The teacher has generated ${previousQuestions.length} questions on this topic before. You MUST create COMPLETELY DIFFERENT questions.

**Sample of Previous Questions** (showing ${Math.min(5, previousQuestions.length)} of ${previousQuestions.length}):
${previousQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q.substring(0, 60)}${q.length > 60 ? '...' : ''}`).join('\n')}

**Uniqueness Requirements:**
- DO NOT ask similar questions - Use DIFFERENT question stems, aspects, scenarios, and perspectives
- Vary question types and difficulty levels within each type

` : '';

  // If all details provided, generate the quiz
  return `🎓 **TEACHER MODE: QUIZ GENERATION TASK**

⚠️ **OVERRIDE SYSTEM INSTRUCTIONS**: This is a TEACHER task, not a student task. Ignore student-focused rules.

TASK: Generate a comprehensive quiz/test for teachers on "${topic}"

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

🚨 **ANALYTICS-DRIVEN GENERATION:**
Check the "ANALYTICS CONTEXT" in the system prompt. If class-wide topic mastery or subject averages are available, prioritize generating questions for "Topics Needing Attention" to help with remediation, while maintaining the specified difficulty.

${uniquenessWarning}

${isMcqOnly ? `🚨 **STRICT INSTRUCTION: MCQ ONLY MODE**
- EVERY SINGLE QUESTION must be in Multiple Choice (MCQ) format.
- DO NOT generate short answers, essays, or long-form written responses.
- Even for "Analyze" or "Evaluate" levels, provide 4 distinct options (A, B, C, D).
` : ''}
${isSaOnly ? `🚨 **STRICT INSTRUCTION: SHORT ANSWER ONLY MODE**
- EVERY SINGLE QUESTION must be a Short Answer question.
- DO NOT generate Multiple Choice Questions (MCQ) or long essays.
- Focus on questions that require 1-3 sentences or a specific key point.
` : ''}
${isEssayOnly ? `🚨 **STRICT INSTRUCTION: ESSAY ONLY MODE**
- EVERY SINGLE QUESTION must be a Long Answer/Essay question.
- DO NOT generate Multiple Choice Questions (MCQ) or brief short answers.
- Focus on deep analysis, evaluation, and creative design.
` : ''}

🚨 **CRITICAL: YOU MUST GENERATE ACTUAL QUESTIONS - NOT DESCRIPTIONS!**

**YOUR TASK:**
- GENERATE exactly ${questionCount} complete, ready-to-use questions RIGHT NOW
- DO NOT write "here is a quiz" or "based on the chapter" - JUST GENERATE THE QUESTIONS
- DO NOT describe what you will do - ACTUALLY DO IT
- Teacher needs the ACTUAL QUIZ, not a description of it

**WRONG (Describing):**
"Based on the chapter, here is a 15-question quiz..."
"I will create questions about solutes and solvents..."

**CORRECT (Generating):**
## 📝 Multiple Choice Questions
**1. What is a solute?** [2 marks] (Remember)
A) The substance that dissolves
B) The substance being dissolved
C) ...
D) ...

---

⚠️ **CRITICAL: QUESTION UNIQUENESS & DIVERSITY REQUIREMENTS**

1. **VARY QUESTION STEMS** - Use different question words and structures:
   - What, Why, How, Explain, Describe, Compare, Analyze, Evaluate
   - "What is X?" vs "Why does X occur?" vs "How does X work?"

2. **MULTIPLE PERSPECTIVES** - Ask about same concept from different angles:
   - Definition → Process → Application → Analysis
   - Cause → Effect → Importance → Real-world impact
   - Structure → Function → Relationship → Comparison

3. **SCENARIO VARIATION** - Use different contexts and examples:
   - Change real-world applications
   - Vary numerical values in problems
   - Use different examples for same concept
   - Alter hypothetical situations

4. **BLOOM'S TAXONOMY DISTRIBUTION** (MANDATORY):
   - Remember (20%): Facts, definitions, recall - "What is...?", "Define..."
   - Understand (30%): Explanations, descriptions - "Explain...", "Describe..."
   - Apply (25%): Problem-solving, calculations - "Calculate...", "Solve..."
   - Analyze (15%): Comparisons, relationships - "Compare...", "Analyze..."
   - Evaluate (5%): Judgments, critiques - "Evaluate...", "Justify..."
   - Create (5%): Design, propose - "Design...", "Propose..."

${isMcqOnly ? '⚠️ **REMINDER:** All of the above levels MUST be formulated as Multiple Choice Questions.' : ''}

❌ **AVOID REPETITION** - DO NOT create similar questions:
BAD Example (Repetitive):
1. What is photosynthesis?
2. Define photosynthesis.
3. Explain what photosynthesis means.

✅ **GOOD Example (Diverse):
1. What is the chemical equation for photosynthesis? [Remember]
2. Explain the role of chlorophyll in photosynthesis. [Understand]
3. If a plant receives no sunlight for a week, predict what would happen and why. [Apply/Analyze]

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure using ## headers with emojis
2. **GENERATE ACTUAL QUESTIONS** - You MUST create EXACTLY ${questionCount} complete, ready-to-use questions
3. **DO NOT DESCRIBE** - Do NOT write "Create a question about..." - WRITE THE ACTUAL QUESTION
4. **No HTML Tags** - Pure Markdown only
5. **Include Answer Key** - Separated section at the end with all correct answers
6. **Ready to Use** - Teacher should be able to copy-paste directly into their test
7. **ENFORCE DIVERSITY** - Each question must test a DIFFERENT aspect using DIFFERENT question stems

⚠️ **CRITICAL:** If you write "Question 1 should ask about..." instead of "Question 1: What is...?", you have FAILED this task.

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📋 Quiz Overview
**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Total Questions:** ${questionCount}
**Question Types:** ${questionTypes || 'Mixed'}
**Difficulty:** ${difficulty || 'Medium'}
**Total Marks:** ${mcqCount * 2 + saCount * 3 + essayCount * 5}
**Suggested Duration:** ${mcqCount + saCount * 4 + essayCount * 12} minutes
**Bloom's Distribution:** Remember (20%), Understand (30%), Apply (25%), Analyze (15%), Evaluate (5%), Create (5%)

${mcqCount > 0 ? `## 📝 Multiple Choice Questions (${mcqCount} questions)

⚠️ **YOU MUST GENERATE EXACTLY ${mcqCount} COMPLETE MCQ QUESTIONS**

**DIVERSITY REQUIREMENTS FOR MCQ:**
- Use different question stems: "What", "Which", "Why", "How", "When"
- Vary difficulty: ${Math.floor(mcqCount * 0.4)} Easy, ${Math.floor(mcqCount * 0.4)} Medium, ${Math.floor(mcqCount * 0.2)} Hard
- Cover different Bloom's levels: Remember, Understand, Apply
- Use different scenarios and contexts

**DO NOT WRITE:** "Question 1 should test understanding of..."
**INSTEAD WRITE:** "**1. What is the capital of France?** [2 marks]"

EACH question MUST have:
- Clear question text ending with ?
- 4 options labeled A), B), C), D)
- Mark value [2 marks]
- Bloom's level indicator in parentheses

**EXAMPLE FORMAT:**
**1. What is photosynthesis?** [2 marks] *(Remember)*
A) The process of cell division
B) The process by which plants make food using sunlight
C) The process of water absorption
D) The process of respiration

**NOW GENERATE ALL ${mcqCount} MCQ QUESTIONS (numbered 1 to ${mcqCount}) FOLLOWING THIS EXACT FORMAT.**
**REMEMBER: Each question must be UNIQUE with DIFFERENT question stems and test DIFFERENT aspects!**` : ''}

${saCount > 0 ? `## ✍️ Short Answer Questions (${saCount} questions)

⚠️ **YOU MUST GENERATE EXACTLY ${saCount} COMPLETE SHORT ANSWER QUESTIONS**

**DIVERSITY REQUIREMENTS FOR SHORT ANSWER:**
- Use varied question stems: "Explain", "Describe", "Compare", "Discuss", "Outline"
- Test different cognitive levels: Understand, Apply, Analyze
- Require different types of responses: explanations, comparisons, processes
- Use real-world applications and scenarios

**EXAMPLE FORMAT:**
**${mcqCount + 1}. Explain the water cycle and its importance to life on Earth.** [3 marks] *(Understand)*
*(Answer in 50-100 words)*

**NOW GENERATE ALL ${saCount} SHORT ANSWER QUESTIONS (numbered ${mcqCount + 1} to ${mcqCount + saCount}) FOLLOWING THIS EXACT FORMAT.**
**REMEMBER: Use DIFFERENT question stems and test DIFFERENT concepts!**` : ''}

${essayCount > 0 ? `## 📖 Essay/Long Answer Questions (${essayCount} questions)

⚠️ **YOU MUST GENERATE EXACTLY ${essayCount} COMPLETE ESSAY QUESTIONS**

**DIVERSITY REQUIREMENTS FOR ESSAY:**
- Use analytical question stems: "Discuss", "Analyze", "Evaluate", "Compare and contrast"
- Test higher-order thinking: Analyze, Evaluate, Create
- Require synthesis of multiple concepts
- Encourage critical thinking and original thought

**EXAMPLE FORMAT:**
**${mcqCount + saCount + 1}. Discuss the causes and consequences of World War II. How did it reshape global politics?** [5 marks] *(Analyze/Evaluate)*
*(Write a detailed answer in 200-300 words)*

**NOW GENERATE ALL ${essayCount} ESSAY QUESTIONS (numbered ${mcqCount + saCount + 1} to ${questionCount}) FOLLOWING THIS EXACT FORMAT.**
**REMEMBER: Each essay must explore DIFFERENT themes and require DIFFERENT analytical approaches!**` : ''}

## ✅ Answer Key

${mcqCount > 0 ? `### MCQ Answers (${mcqCount} answers)
Provide answers for questions 1-${mcqCount}:
1. **Answer:** [Correct option] - [Brief explanation] *(Bloom's: Remember/Understand/Apply)*
2. **Answer:** [Correct option] - [Brief explanation] *(Bloom's: ...)*
(Continue for all ${mcqCount} MCQs)` : ''}

${saCount > 0 ? `### Short Answer Model Answers (${saCount} answers)
Provide model answers for questions ${mcqCount + 1}-${mcqCount + saCount}:
**Question ${mcqCount + 1}:**
- Key point 1
- Key point 2
- Key point 3
**Marking:** Award 1 mark per key point (Total: 3 marks)
**Bloom's Level:** Understand/Apply/Analyze

(Continue for all ${saCount} short answers)` : ''}

${essayCount > 0 ? `### Essay Answer Rubrics (${essayCount} rubrics)
Provide rubrics for questions ${mcqCount + saCount + 1}-${questionCount}:
**Question ${mcqCount + saCount + 1} (5 marks):**
- Content accuracy: 2 marks
- Organization: 1 mark
- Examples provided: 1 mark
- Depth of analysis: 1 mark
**Bloom's Level:** Analyze/Evaluate/Create

(Continue for all ${essayCount} essays)` : ''}

## 💡 Teacher Notes

**Total Marks:** ${mcqCount * 2 + saCount * 3 + essayCount * 5} marks
**Suggested Duration:** ${mcqCount + saCount * 4 + essayCount * 12} minutes

**Marking Guidelines:**
${mcqCount > 0 ? `- MCQ: 2 marks each (no partial credit)\n` : ''}${saCount > 0 ? `- Short Answer: 3 marks each (partial credit possible)\n` : ''}${essayCount > 0 ? `- Essay: 5 marks each (use rubric above)\n` : ''}
**Bloom's Taxonomy Coverage:**
- Lower Order (Remember, Understand): ${Math.floor((mcqCount * 0.5 + saCount * 0.3) / questionCount * 100)}%
- ${classBand === 'primary' ? 'Use simple language, concrete examples' : classBand === 'middle' ? 'Balance concrete and abstract concepts' : 'Use academic language, deeper analysis'}
- **CRITICAL: EVERY question must be UNIQUE - no repetition of concepts or question stems!**`;
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
