import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Explain Prompt Template (LangChain)
 * Variables: {concept}, {classBand}, {masteryProfile}
 */
export const ExplainPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Explain the concept of "{concept}" in a clear, well-formatted way.

STYLE: {classBandStyle}

CONTEXT: Use the provided RAG content to ensure accuracy.

MASTERY: The student's profile says: {masteryProfile}.
ANALYTICS: Check "ANALYTICS CONTEXT" in the system prompt for detailed student performance, strengths, and weaknesses. 
ADJUSTMENT: Use this data to tailor the explanation. For example, use their "Strengths" to build analogies or cross-references, and spend more time on "Weaknesses" related to this concept.

FORMATTING REQUIREMENTS:
- Use Markdown with ## emoji headers for all major sections
- For mathematical formulas, use LaTeX notation: $inline$ for inline formulas, $$block$$ for block formulas
- Use **bold** for key terms and *italic* for emphasis
- Use bullet points (-) for lists
- Use numbered lists (1., 2., 3.) for steps
- Use > for important notes or tips
- Use code blocks ( \` \` \` ) for code or special notation
- Structure your response with clear sections using ## headings
- NO HTML TAGS - pure Markdown only

RESPONSE STRUCTURE:
## 📚 Concept Overview

[Brief introduction to the concept]

## 🔑 Key Points

- Point 1
- Point 2
- Point 3

## 📖 Detailed Explanation

[Comprehensive explanation with examples]

## 💡 Example

[Practical example with step-by-step solution if applicable]

## ✨ Remember

[Memory hook or key takeaway]

## 🎯 Quick Check

[One thought-provoking question to test understanding]`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Enhanced for comprehensive, detailed explanations
 * Now generates pure Markdown - frontend transforms to collapsible sections
 * @deprecated Use ExplainPromptTemplate.invoke() instead
 */
export const ExplainPrompt = (concept: string, classBand: string, masteryProfile: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Provide a comprehensive, detailed explanation of the concept: "${concept}"

STYLE: ${classBandStyle}

CONTEXT: Use the provided RAG content to ensure accuracy and reference actual study material.

MASTERY: ${masteryProfile}. 
ANALYTICS: Check "ANALYTICS CONTEXT" in the system prompt for detailed student performance, strengths, and weaknesses.
ADJUSTMENT: Use this information to personalize the explanation. If the student is strong in a related subject or topic, use it as a bridge. If they are weak here, simplify the language and use more concrete examples.

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis for each major section
2. **Section Format** - Use exactly this format: ## 📚 Section Title
3. **No HTML Tags** - Use pure Markdown only (no <details>, <summary>, or other HTML tags)
4. **Be Thorough** - Provide detailed explanations with all necessary formulas
5. **Use Examples** - Include practical, relatable examples
6. **Visual Structure** - Use proper markdown and LaTeX formatting
7. **Build Understanding** - Start simple, then add complexity
8. **Make it Memorable** - Include memory hooks and analogies

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📚 Concept Overview

[Start with a simple, one-sentence definition]
[Then expand with 2-3 paragraphs of clear explanation]

## 🔑 Key Points

- **Point 1:** [Important aspect with explanation]
- **Point 2:** [Another key concept]
- **Point 3:** [Critical understanding]
- **Point 4:** [Additional insight if needed]

## 📖 Detailed Explanation

[Comprehensive explanation with multiple paragraphs]
[Include relevant formulas using LaTeX: $inline$ or $$block$$]
[Break down complex ideas into digestible parts]
[Use analogies to make abstract concepts concrete]

**Important Formula:**
$$formula$$
Where:
- Variable 1 = explanation
- Variable 2 = explanation

## 💡 Practical Example

**Example:** [Real-world or textbook-style example]

**Given:**
- Information 1
- Information 2

**Solution:**
[Step-by-step walkthrough of the example]
$$calculation$$

**Result:** [Clear conclusion]

## 🎯 Why This Matters

[Explain the importance and applications of this concept]
[Connect to other topics or real-world scenarios]

## ✨ Memory Hook

[Provide a memorable way to remember this concept]
[Could be an acronym, rhyme, or simple analogy]

## 🤔 Common Mistakes to Avoid

> ⚠️ **Mistake 1:** [Common error students make]
> ✅ **Instead:** [Correct approach]

> ⚠️ **Mistake 2:** [Another common pitfall]
> ✅ **Instead:** [Better way]

## 🎯 Quick Self-Check

[One thought-provoking question to test understanding]
[Should require applying the concept, not just recalling it]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for key terms and important points
- Use *italic* for emphasis
- Use LaTeX for ALL mathematical formulas and expressions: $inline$ or $$block$$
- Use bullet points (-) for lists
- Use numbered lists (1., 2., 3.) for sequential steps
- Use > for important notes, tips, or warnings
- Use code blocks (\`\`\`) for special notation if needed
- NO HTML TAGS - pure Markdown only`;
};

