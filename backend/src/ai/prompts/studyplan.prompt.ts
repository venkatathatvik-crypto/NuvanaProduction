import { ClassBandStyles } from './classband.styles';

export const StudyPlanPrompt = (topic: string, goals: string, timeframe: string, classBand: string) => `
TASK: Generate a personalized study plan for "${topic}".

GOALS: ${goals}
TIMEFRAME: ${timeframe}
STYLE: ${ClassBandStyles[classBand]}

STRUCTURE:
- Day-by-day or Week-by-week breakdown.
- Specific topics to cover.
- Recommended practice types (reading, solving, testing).
- Checkpoints for self-assessment.
`;
