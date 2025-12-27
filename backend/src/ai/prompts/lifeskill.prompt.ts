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

FORMATTING REQUIREMENTS:
- Use HTML <details> and <summary> tags for ALL major headings to create collapsible sections
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nContent...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly

RESPONSE STRUCTURE:
<details>
<summary>🤝 Empowerment & Empathy</summary>

[Validate feelings and provide encouragement]
</details>

<details>
<summary>🧠 Mindset Shift</summary>

[Provide a Growth Mindset or Stoic perspective shift]
</details>

<details>
<summary>🚀 Actionable Steps (3 Today)</summary>

1. [Specific thing to do]
2. [Specific thing to do]
3. [Specific thing to do]
</details>

<details>
<summary>✨ Inspiring Quote</summary>

[A relevant quote to motivate the student]
</details>`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Now generates pure Markdown - frontend transforms to collapsible sections
 * @deprecated Use LifeSkillPromptTemplate.invoke() instead
 */
export const LifeSkillPrompt = (context: string, skill: string) => {
    return `TASK: Provide life skills coaching on "${skill}".

CONTEXT: The student is dealing with: "${context}"

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 🤝 Section Title
3. **No HTML Tags** - Use pure Markdown only

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 🤝 Empowerment & Empathy

[Validate their feelings and provide encouragement]

## 🧠 Mindset Shift

[Provide a Growth Mindset or Stoic perspective shift]

## 🚀 Actionable Steps (3 Today)

1. [Specific thing to do]
2. [Specific thing to do]
3. [Specific thing to do]

## ✨ Inspiring Quote

[A relevant quote to motivate the student - e.g., Marcus Aurelius, Steve Jobs, Atomic Habits]

APPROACH:
- Empathy first: Validate their feelings
- Stoic/Growth Mindset: Offer a perspective shift
- Actionable Steps: 3 small specific things they can do today
- Inspiring Quote: A relevant motivational quote
- NO HTML TAGS - pure Markdown only`;
};

