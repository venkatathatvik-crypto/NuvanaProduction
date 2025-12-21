import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Life Skill Prompt Template (LangChain)
 * Variables: {context}, {skill}
 */
export const LifeSkillPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Provide life skills coaching on "{skill}".

CONTEXT: The student is dealing with: "{context}"

APPROACH:
- Empathy first: Validate their feelings.
- Stoic/Growth Mindset: Offer a perspective shift.
- Actionable Steps: 3 small specific things they can do today.
- Inspiring Quote: A relevant quote (e.g., Marcus Aurelius, Steve Jobs, Atomic Habits).`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * @deprecated Use LifeSkillPromptTemplate.invoke() instead
 */
export const LifeSkillPrompt = (context: string, skill: string) => {
    return `TASK: Provide life skills coaching on "${skill}".

CONTEXT: The student is dealing with: "${context}"

APPROACH:
- Empathy first: Validate their feelings.
- Stoic/Growth Mindset: Offer a perspective shift.
- Actionable Steps: 3 small things specific they can do today.
- Inspiring Quote: A relevant quote (e.g., Marcus Aurelius, Steve Jobs, Atomic Habits).`;
};
