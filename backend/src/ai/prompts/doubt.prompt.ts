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
- Use Markdown with ## emoji headers for all major sections
- Use LaTeX for formulas: $inline$ or $$block$$
- Use **bold** for key points
- Use analogies and examples
- Use > for important clarifications
- NO HTML TAGS - pure Markdown only

RESPONSE STRUCTURE:
## 🤔 Understanding Your Doubt

[Rephrase the doubt to show understanding]

## 🔍 The Misconception

[Identify the underlying confusion]

## 💡 Clear Explanation

[Address the doubt directly with examples]

## 🌟 Analogy

[Use a relatable analogy to clarify]

## ✅ Key Takeaway

[Summarize the correct understanding]

## 🎯 Practice Tip

[Suggest how to avoid this confusion in future]`,
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

