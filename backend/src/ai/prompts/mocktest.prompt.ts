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

FORMAT:
1. Section A: Multiple Choice (5 questions).
2. Section B: Short Answers (3 questions).
3. Section C: Problem Solving (2 questions).

Include an Answer Key at the very end.`,
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
