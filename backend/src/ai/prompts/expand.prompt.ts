import { ClassBandStyles } from './classband.styles';

export const ExpandPrompt = (topic: string, classBand: string) => `
TASK: Expand on the topic "${topic}" to provide enrichment beyond the standard syllabus.

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

CONTENT:
- Real-world applications.
- Historical context or future implications.
- Interdisciplinary connections (how this relates to other subjects).
`;
