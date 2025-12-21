import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Summary Prompt Template (LangChain)
 * Variables: {topic}, {classBand}
 */
export const SummaryPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Summarize the topic "{topic}" in a student-friendly format.

STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use markdown with clear sections
- Use LaTeX for formulas
- Use bullet points for lists
- Use **bold** for key terms
- Include emojis for visual appeal

RESPONSE STRUCTURE:
### 📚 Topic: {topic}

### 🎯 In a Nutshell
[2-3 sentence overview]

### 🔑 Need to Know (Top 5)
1. **Point 1:** [Explanation]
2. **Point 2:** [Explanation]
3. **Point 3:** [Explanation]
4. **Point 4:** [Explanation]
5. **Point 5:** [Explanation]

### 🧠 Memory Hook
[Mnemonic, acronym, or memorable phrase]

### 📝 Quick Formula Reference
[If applicable, list key formulas with LaTeX]

### ⚡ Common Mistakes to Avoid
- Mistake 1
- Mistake 2`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use SummaryPromptTemplate.invoke() instead
 */
export const SummaryPrompt = (topic: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Summarize the topic "${topic}".

STYLE: ${classBandStyle}

REQUIREMENTS:
- concise overview.
- 5 bullet points of "Need to Know".
- A "Memory Hook" or mnemonic to remember the key concept.`;
};
