import { ClassBandStyles } from './classband.styles';

export const ExplainPrompt = (concept: string, classBand: string, masteryProfile: string) => `
TASK: Explain the concept of "${concept}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

CONTEXT: Use the provided RAG content to ensure accuracy.

MASTERY: The student's profile says: ${masteryProfile}. detailed explanation accordingly.
`;

export const SolvePrompt = (problem: string, classBand: string) => `
TASK: Solve the following problem step-by-step: "${problem}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

INSTRUCTIONS:
1. Break down the problem.
2. Identify the formula or concept needed.
3. Show the calculation clearly.
4. Explain *why* each step is taken.
`;

export const DoubtPrompt = (doubt: string, context: string, classBand: string) => `
TASK: Resolve the student's doubt: "${doubt}".

CONTEXT: Reference this material: ${context}

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

GOAL: Clear the confusion without giving just a dry answer. Use an analogy if helpful.
`;
