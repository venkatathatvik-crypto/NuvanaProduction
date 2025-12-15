import { ClassBandStyles } from './classband.styles';

export const DoubtPrompt = (doubt: string, context: string, classBand: string) => `
TASK: Resolve the student's doubt: "${doubt}".

CONTEXT: Reference this material: ${context}

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

GOAL: Identify the underlying misconception first. Clear the confusion without giving just a dry answer. Use an analogy if helpful.
`;
