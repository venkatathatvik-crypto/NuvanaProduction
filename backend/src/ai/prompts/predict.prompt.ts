import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Predict Prompt Template (LangChain)
 * Variables: {topic}, {pastPatterns}, {classBand}
 */
export const PredictPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Predict high-probability exam questions for "{topic}".

DATA: Based on past trends: {pastPatterns}
STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use HTML <details> and <summary> tags for ALL major headings to create collapsible sections
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nContent...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly

RESPONSE STRUCTURE:
<details>
<summary>🔍 Short Answer Predictions (3 Questions)</summary>

[3 High-probability short answer questions]
</details>

<details>
<summary>📝 Long Form Predictions (2 Questions)</summary>

[2 Essay or long-form questions]
</details>

<details>
<summary>⚾ The Curveball Question</summary>

[1 Tricky or conceptual question to test deep understanding]
</details>`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use PredictPromptTemplate.invoke() instead
 */
export const PredictPrompt = (topic: string, pastPatterns: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand];
    return `TASK: Predict high-probability exam questions for "${topic}".

DATA: Based on past trends: ${pastPatterns}
STYLE: ${classBandStyle}

OUTPUT:
- 3 Short Answer Questions.
- 2 Long Form/Essay Questions.
- 1 "Curveball" Question (tricky/conceptual).`;
};
