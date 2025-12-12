import { ClassBandStyles } from './classband.styles';

export const PredictPrompt = (topic: string, pastPatterns: string, classBand: string) => `
TASK: Predict high-probability exam questions for "${topic}".

DATA: Based on past trends: ${pastPatterns}
STYLE: ${ClassBandStyles[classBand]}

OUTPUT:
- 3 Short Answer Questions.
- 2 Long Form/Essay Questions.
- 1 "Curveball" Question (tricky/conceptual).
`;
