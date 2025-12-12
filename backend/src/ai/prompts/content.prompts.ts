import { ClassBandStyles } from './classband.styles';

export const SummaryPrompt = (topic: string, classBand: string) => `
TASK: Summarize the topic "${topic}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

REQUIREMENTS:
- concise overview.
- 5 bullet points of "Need to Know".
- A "Memory Hook" or mnemonic to remember the key concept.
`;

export const ExpandPrompt = (topic: string, classBand: string) => `
TASK: Expand on the topic "${topic}" to provide enrichment beyond the standard syllabus.

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

CONTENT:
- Real-world applications.
- Historical context or future implications.
- Interdisciplinary connections (how this relates to other subjects).
`;
