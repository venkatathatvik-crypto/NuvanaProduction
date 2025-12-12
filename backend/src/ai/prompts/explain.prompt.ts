import { ClassBandStyles } from './classband.styles';

export const ExplainPrompt = (concept: string, classBand: string, masteryProfile: string) => `
TASK: Explain the concept of "${concept}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

CONTEXT: Use the provided RAG content to ensure accuracy.

MASTERY: The student's profile says: ${masteryProfile}. detailed explanation accordingly.
`;
