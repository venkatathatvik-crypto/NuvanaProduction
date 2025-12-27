import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Doubt Prompt Template (LangChain)
 * Variables: {doubt}, {context}, {classBand}
 */
export const DoubtPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Resolve the student's doubt: "{doubt}".

CONTEXT: Reference this material: {context}

STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use HTML <details> and <summary> tags for ALL major headings to create collapsible sections
- Format: <details><summary>Section Title</summary>\\n\\n### Section Title\\n\\nContent...</details>
- CRITICAL: DO NOT use backticks around the tags in your response. Use them as raw HTML.
- CRITICAL: DO NOT wrap the entire response in a single <details> tag. Each section must be its own independent block.
- Always put two newlines after the summary tag to ensure markdown inside renders correctly
- Use LaTeX for formulas: $inline$ or $$block$$
- Use **bold** for key points
- Use analogies and examples
- Use > for important clarifications

RESPONSE STRUCTURE:
<details>
<summary>🤔 Understanding Your Doubt</summary>

[Rephrase the doubt to show understanding]
</details>

<details>
<summary>🔍 The Misconception</summary>

[Identify the underlying confusion]
</details>

<details>
<summary>💡 Clear Explanation</summary>

[Address the doubt directly with examples]
</details>

<details>
<summary>🌟 Analogy</summary>

[Use a relatable analogy to clarify]
</details>

<details>
<summary>✅ Key Takeaway</summary>

[Summarize the correct understanding]
</details>

<details>
<summary>🎯 Practice Tip</summary>

[Suggest how to avoid this confusion in future]
</details>`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Enhanced for comprehensive doubt resolution
 * Now generates pure Markdown - frontend transforms to collapsible sections
 * @deprecated Use DoubtPromptTemplate.invoke() instead
 */
export const DoubtPrompt = (doubt: string, context: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Resolve the student's doubt comprehensively: "${doubt}"

CONTEXT: Reference this material: ${context}

STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis for each major section
2. **Section Format** - Use exactly this format: ## 🤔 Section Title
3. **No HTML Tags** - Use pure Markdown only (no <details>, <summary>, or other HTML tags)
4. **Identify the Root Cause** - Find the underlying misconception
5. **Clear the Confusion** - Provide crystal-clear explanation
6. **Use Examples** - Show concrete examples to illustrate
7. **Use Analogies** - Make abstract concepts relatable
8. **Prevent Future Confusion** - Give tips to avoid this mistake

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 🤔 Understanding Your Doubt

[Rephrase the doubt to show you understand it]
[Acknowledge that this is a common confusion point]

## 🔍 The Root Misconception

[Identify what's causing the confusion]
[Explain why students often get confused here]

## 💡 Clear Explanation

[Provide a thorough, step-by-step explanation]
[Use simple language and break it down]
[Include formulas if needed: $inline$ or $$block$$]

**The Key Difference:**
[Highlight the critical distinction that resolves the doubt]

## 🌟 Relatable Analogy

[Use a real-world analogy to make it click]
[Something the student can visualize or relate to]

## 📝 Concrete Example

**Example:** [Specific example that demonstrates the concept]
[Show how it works in practice]
[Compare with the wrong approach to highlight the difference]

## ✅ The Correct Understanding

[Summarize the correct way to think about this]
[State it clearly in 2-3 sentences]

## 🎯 Practice Tip

[Suggest how to avoid this confusion in the future]
[Give a quick check or rule of thumb]

## 💭 Related Concepts

[Mention related topics that might help deepen understanding]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for key clarifications
- Use LaTeX for mathematical expressions: $inline$ or $$block$$
- Use > for important clarifications or warnings
- Use analogies that match the student's class band
- Keep language encouraging and supportive
- NO HTML TAGS - pure Markdown only`;
};

