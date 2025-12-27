import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Solve Prompt Template (LangChain)
 * Variables: {problem}, {classBand}
 */
export const SolvePromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Solve the following problem step-by-step with clear formatting: "{problem}".

STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use Markdown with ## emoji headers for all major sections
- Use LaTeX for all mathematical expressions: $x^2 + 5x + 6$ for inline, $$\\frac{{a}}{{b}}$$ for block
- Use **bold** for important steps
- Number each step clearly (1., 2., 3.)
- Show all work with proper mathematical notation
- Use > for key insights or tips
- NO HTML TAGS - pure Markdown only

RESPONSE STRUCTURE:
## 📝 Problem Analysis

[Understand what's being asked]

## 🔍 Given Information

- List all given values
- Identify what needs to be found

## 📐 Formula/Concept

[State the relevant formula or concept with LaTeX]
$$formula$$

## 🎯 Step-by-Step Solution

**Step 1:** [First step with explanation]
$$calculation$$

**Step 2:** [Second step with explanation]
$$calculation$$

**Step 3:** [Continue...]

## ✅ Final Answer

[Clear, boxed final answer]
$$\\boxed{{answer}}$$

## 💭 Why This Works

[Brief explanation of the logic]`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Enhanced to always generate comprehensive solutions using Gemini
 * Now generates pure Markdown - frontend transforms to collapsible sections
 * @deprecated Use SolvePromptTemplate.invoke() instead
 */
export const SolvePrompt = (problem: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Solve the following problem with complete, detailed step-by-step solution: "${problem}"

STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis for each major section
2. **Section Format** - Use exactly this format: ## 📝 Section Title
3. **No HTML Tags** - Use pure Markdown only (no <details>, <summary>, or other HTML tags)
4. **Always provide a complete solution** - Even if you don't have exact reference material, use your knowledge to solve the problem
5. **Break down the problem** - Identify what's given and what needs to be found
6. **Show ALL steps** - Don't skip any intermediate calculations
7. **Use proper notation** - Use LaTeX for all mathematical expressions: $inline$ or $$block$$
8. **Explain each step** - Don't just show calculations, explain WHY you're doing each step
9. **Verify the answer** - Check if the final answer makes sense

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📝 Problem Analysis

[Clearly state what the problem is asking]

## 🔍 Given Information

- List all given values and conditions
- Identify what needs to be found

## 📐 Formula/Concept Required

[State the relevant formula or concept with LaTeX]
$$formula$$

## 🎯 Step-by-Step Solution

**Step 1:** [First step with clear explanation]
$$calculation$$
[Explain why this step is needed]

**Step 2:** [Second step with clear explanation]
$$calculation$$
[Explain the logic]

**Step 3:** [Continue with all necessary steps...]
$$calculation$$

## ✅ Final Answer

[Present the final answer clearly, boxed if appropriate]
$$\\boxed{answer}$$

## 💭 Why This Works

[Brief explanation of the underlying concept and logic]

## 🎓 Key Takeaway

[One important lesson from this problem]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for step labels and important terms
- Use LaTeX for ALL mathematical expressions: $inline$ or $$block$$
- Number each step clearly
- Use > for important tips or common mistakes to avoid
- Keep explanations clear and student-friendly
- NO HTML TAGS - pure Markdown only`;
};

