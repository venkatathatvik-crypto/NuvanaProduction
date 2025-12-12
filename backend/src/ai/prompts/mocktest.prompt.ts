import { ClassBandStyles } from './classband.styles';

export const MockTestPrompt = (topics: string[], difficulty: string, duration: string, classBand: string) => `
TASK: Generate a mock test.

TOPICS: ${topics.join(', ')}
DIFFICULTY: ${difficulty}
DURATION: ${duration}
STYLE: ${ClassBandStyles[classBand]}

FORMAT:
1. Section A: Multiple Choice (5 questions).
2. Section B: Short Answers (3 questions).
3. Section C: Problem Solving (2 questions).

Include an Answer Key at the very end.
`;
