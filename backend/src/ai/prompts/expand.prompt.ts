import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Expand Prompt Template (LangChain)
 * Variables: {topic}, {classBand}
 */
export const ExpandPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Expand on the topic "{topic}" to provide enrichment beyond the standard syllabus.

STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use HTML <details> and <summary> tags for ALL major headings to create collapsible sections
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nContent...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly

RESPONSE STRUCTURE:
<details>
<summary>🌍 Real-World Applications</summary>

[Explain how this topic is used in the real world]
</details>

<details>
<summary>📅 History & Future</summary>

[Provide historical context or future implications]
</details>

<details>
<summary>🔗 Interdisciplinary Connections</summary>

[Explain how this relates to other subjects]
</details>`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use ExpandPromptTemplate.invoke() instead
 */
export const ExpandPrompt = (topic: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Expand on the topic "${topic}" to provide enrichment beyond the standard syllabus.

STYLE: ${classBandStyle}

CONTENT:
- Real-world applications.
- Historical context or future implications.
- Interdisciplinary connections (how this relates to other subjects).`;
};
