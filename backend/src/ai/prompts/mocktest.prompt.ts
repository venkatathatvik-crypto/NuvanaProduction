import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Mock Test Prompt Template (LangChain)
 * Variables: {topics}, {difficulty}, {duration}, {classBand}
 */
export const MockTestPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Generate a mock test.

TOPICS: {topics}
DIFFICULTY: {difficulty}
DURATION: {duration}
STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use HTML <details> and <summary> tags for ALL major sections to create a neat, collapsible test
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nQuestions...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly

RESPONSE STRUCTURE:
<details>
<summary>📝 Section A: Multiple Choice (5 questions)</summary>

[5 MCQ questions with options]
</details>

<details>
<summary>🔍 Section B: Short Answers (3 questions)</summary>

[3 Short answer questions]
</details>

<details>
<summary>📐 Section C: Problem Solving (2 questions)</summary>

[2 Problem solving questions]
</details>

<details>
<summary>✅ Answer Key</summary>

[Detailed answer key for all sections]
</details>`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use MockTestPromptTemplate.invoke() instead
 */
export const MockTestPrompt = (topics: string[], difficulty: string, duration: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand];
    return `TASK: Generate a mock test.

TOPICS: ${topics.join(', ')}
DIFFICULTY: ${difficulty}
DURATION: ${duration}
STYLE: ${classBandStyle}

FORMAT:
1. Section A: Multiple Choice (5 questions).
2. Section B: Short Answers (3 questions).
3. Section C: Problem Solving (2 questions).

Include an Answer Key at the very end.`;
};
