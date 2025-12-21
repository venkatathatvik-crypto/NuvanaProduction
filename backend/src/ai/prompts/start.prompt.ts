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
export const StartPrompt = (query: string, ragContext: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
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
