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

OUTPUT:
- 3 Short Answer Questions.
- 2 Long Form/Essay Questions.
- 1 "Curveball" Question (tricky/conceptual).`,
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
