import { ClassBandStyles } from './classband.styles';

export const SummaryPrompt = (topic: string, classBand: string) => `
TASK: Summarize the topic "${topic}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

REQUIREMENTS:
- concise overview.
- 5 bullet points of "Need to Know".
- A "Memory Hook" or mnemonic to remember the key concept.
`;
