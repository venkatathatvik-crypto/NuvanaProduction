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
- Use HTML <details> and <summary> tags for ALL major headings to create collapsible sections
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nContent...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly
- Use LaTeX for formulas
- Use bullet points for lists
- Use **bold** for key terms
- Include emojis for visual appeal

RESPONSE STRUCTURE:
### 📚 Topic: {topic}

<details>
<summary>🎯 In a Nutshell</summary>

[2-3 sentence overview]
</details>

<details>
<summary>🔑 Need to Know (Top 5)</summary>

1. **Point 1:** [Explanation]
2. **Point 2:** [Explanation]
3. **Point 3:** [Explanation]
4. **Point 4:** [Explanation]
5. **Point 5:** [Explanation]
</details>

<details>
<summary>🧠 Memory Hook</summary>

[Mnemonic, acronym, or memorable phrase]
</details>

<details>
<summary>📝 Quick Formula Reference</summary>

[If applicable, list key formulas with LaTeX]
</details>

<details>
<summary>⚡ Common Mistakes to Avoid</summary>

- Mistake 1
- Mistake 2
</details>`,
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
