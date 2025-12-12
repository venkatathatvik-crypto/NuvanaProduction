import { ClassBandStyles } from './classband.styles';

export const SolvePrompt = (problem: string, classBand: string) => `
TASK: Solve the following problem step-by-step: "${problem}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

INSTRUCTIONS:
1. Break down the problem.
2. Identify the formula or concept needed.
3. Show the calculation clearly.
4. Explain *why* each step is taken.
`;
