import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Start/Default Mode Prompt Template (LangChain)
 * Used when student asks without selecting a specific mode
 * Provides moderate response with basic definitions
 * Variables: {query}, {context}, {classBand}
 */
export const StartPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Provide a helpful, moderate-length response to: "{query}"

CONTEXT: {context}

STYLE: {classBandStyle}

RESPONSE REQUIREMENTS:
- Length: Moderate (2-3 paragraphs, not too brief, not too detailed)
- Include basic definition if the query is about a concept
- Use simple, clear language
- Use proper markdown formatting
- Use LaTeX for any formulas: $inline$ or $$block$$
- Be friendly and encouraging
- **ANALYTICS-AWARE:** Check the "ANALYTICS CONTEXT" in the system prompt. If available, start with a brief (1-sentence) personalized greeting or encouragement based on their performance (e.g., "Great job on your recent science tests!", "I see you're working hard on Math, let's keep it up!")

RESPONSE STRUCTURE:
### 📚 Quick Answer
[Provide a clear, moderate-length explanation with basic definition]

### 💡 Key Points
- Point 1
- Point 2
- Point 3 (if applicable)

### 🎯 Want More Help?
For detailed explanations, step-by-step solutions, or personalized study plans, select a mode above:
- **Explain** - Deep dive into concepts
- **Solve** - Step-by-step problem solving
- **Doubt** - Clear your confusion
- **Study Plan** - Organized learning path

IMPORTANT:
- If the context is empty or shows [NO RELEVANT CONTENT FOUND], still provide a general helpful response based on common knowledge
- Always end with the "Want More Help?" section to guide students to specialized modes`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use StartPromptTemplate.invoke() instead
 */
export const StartPrompt = (query: string, ragContext: string, classBand: string, isTeacher: boolean = false) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    
    // Teacher-specific default mode response
    if (isTeacher) {
        return `TASK: Provide helpful guidance for: "${query}"

TEACHER MODE: You are helping a teacher with educational tasks

RESPONSE STRUCTURE:
### 🍎 Teacher Assistant

${query.toLowerCase().includes('help') || query.toLowerCase().includes('what can') || query.length < 20 ? 
`I'm your AI Teaching Assistant, ready to help with:

**📚 Lesson Planning** - Create structured, multi-day lesson plans with timetables
**📝 Quiz Creation** - Generate questions from your uploaded materials (PDFs)
**✉️ Email Drafting** - Professional communication with parents and administration
**📊 Grade Papers** - AI-powered grading with detailed feedback and rubrics
**📖 Simplify Content** - Make complex topics easier for students
**🎯 Classroom Activities** - Engaging activities for better learning

**Available Integrations:**
- ✅ **PDF Content Access** - I can use your uploaded course materials for quiz generation
- ✅ **Subject-Specific** - Select a subject from the dropdown for context-aware help
- ✅ **Grade-Level Adaptation** - Content adjusted to your students' level

**To get started:** Select a mode button below (Lesson Plan, Create Quiz, Email Draft, etc.) and describe what you need!` 
: `[Provide a brief, helpful answer to their specific query]

**Need specialized help?** Select a mode below:
- **Lesson Plan** - Multi-day timetables  
- **Create Quiz** - Questions from your PDFs
- **Email Draft** - Professional communications
- **Grade Paper** - Automated grading with feedback`}

IMPORTANT:
- Keep responses concise and action-oriented
- **ANALYTICS-DRIVEN:** Check the "ANALYTICS CONTEXT" in the system prompt. If class-wide topic mastery or subject averages are available, briefly mention an insight (e.g., "I notice the class is struggling with Topic X, would you like to create a quiz for it?")
- Always guide teachers to specialized modes for complex tasks`;
    }
    return `TASK: Provide a helpful, moderate-length response to: "${query}"

CONTEXT: ${ragContext}

STYLE: ${classBandStyle}

RESPONSE REQUIREMENTS:
- Length: Moderate (2-3 paragraphs, not too brief, not too detailed)
- Include basic definition if the query is about a concept
- Use simple, clear language
- Use proper markdown formatting
- Use LaTeX for any formulas: $inline$ or $$block$$
- Be friendly and encouraging
- **IMPORTANT:** Use the provided RAG context which is already filtered by the student's selected subject and class

RESPONSE STRUCTURE:
### 📚 Quick Answer
[Provide a clear, moderate-length explanation with basic definition]
[Reference the subject-specific context if available]

### 💡 Key Points
- Point 1
- Point 2
- Point 3 (if applicable)

### 🎯 Want More Help?
For detailed explanations, step-by-step solutions, or personalized study plans, select a mode above:
- **Explain** - Deep dive into concepts
- **Solve** - Step-by-step problem solving
- **Doubt** - Clear your confusion
- **Study Plan** - Organized learning path

IMPORTANT:
- The context is already filtered by subject - use it to provide subject-specific answers
- If the context is empty or shows [NO RELEVANT CONTENT FOUND], provide a general helpful response and suggest the student select a subject from the dropdown
- Always end with the "Want More Help?" section to guide students to specialized modes`;

};
