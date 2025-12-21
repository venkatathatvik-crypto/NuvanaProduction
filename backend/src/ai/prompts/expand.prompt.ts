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

CONTENT:
- Real-world applications.
- Historical context or future implications.
- Interdisciplinary connections (how this relates to other subjects).`,
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
