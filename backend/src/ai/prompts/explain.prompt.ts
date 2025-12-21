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

MASTERY: The student's profile says: {masteryProfile}. Adjust the detailed explanation accordingly.

FORMATTING REQUIREMENTS:
- Use proper markdown formatting
- For mathematical formulas, use LaTeX notation: $inline$ for inline formulas, $$block$$ for block formulas
- Use **bold** for key terms and *italic* for emphasis
- Use bullet points (-) for lists
- Use numbered lists (1., 2., 3.) for steps
- Use > for important notes or tips
- Use code blocks (\`\`\`) for code or special notation
- Structure your response with clear sections using ### headings

RESPONSE STRUCTURE:
### 📚 Concept Overview
[Brief introduction to the concept]

### 🔑 Key Points
- Point 1
- Point 2
- Point 3

### 📖 Detailed Explanation
[Comprehensive explanation with examples]

### 💡 Example
[Practical example with step-by-step solution if applicable]

### ✨ Remember
[Memory hook or key takeaway]

### 🎯 Quick Check
[One thought-provoking question to test understanding]`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Enhanced for comprehensive, detailed explanations
 * @deprecated Use ExplainPromptTemplate.invoke() instead
 */
export const ExplainPrompt = (concept: string, classBand: string, masteryProfile: string) => {
    const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
    return `TASK: Provide a comprehensive, detailed explanation of the concept: "${concept}"

STYLE: ${classBandStyle}

CONTEXT: Use the provided RAG content to ensure accuracy and reference actual study material.

MASTERY: The student's profile says: ${masteryProfile}. Adjust the depth and complexity accordingly.

CRITICAL INSTRUCTIONS:
1. **Be Thorough** - Provide detailed explanations with all necessary formulas
2. **Use Examples** - Include practical, relatable examples
3. **Visual Structure** - Use proper markdown and LaTeX formatting
4. **Build Understanding** - Start simple, then add complexity
5. **Make it Memorable** - Include memory hooks and analogies

RESPONSE STRUCTURE:

### 📚 Concept Overview
[Start with a simple, one-sentence definition]
[Then expand with 2-3 paragraphs of clear explanation]

### 🔑 Key Points
- **Point 1:** [Important aspect with explanation]
- **Point 2:** [Another key concept]
- **Point 3:** [Critical understanding]
- **Point 4:** [Additional insight if needed]

### 📖 Detailed Explanation
[Comprehensive explanation with multiple paragraphs]
[Include relevant formulas using LaTeX: $inline$ or $$block$$]
[Break down complex ideas into digestible parts]
[Use analogies to make abstract concepts concrete]

**Important Formula:**
$$formula$$
Where:
- Variable 1 = explanation
- Variable 2 = explanation

### 💡 Practical Example
**Example:** [Real-world or textbook-style example]

**Given:**
- Information 1
- Information 2

**Solution:**
[Step-by-step walkthrough of the example]
$$calculation$$

**Result:** [Clear conclusion]

### 🎯 Why This Matters
[Explain the importance and applications of this concept]
[Connect to other topics or real-world scenarios]

### ✨ Memory Hook
[Provide a memorable way to remember this concept]
[Could be an acronym, rhyme, or simple analogy]

### 🤔 Common Mistakes to Avoid
> ⚠️ **Mistake 1:** [Common error students make]
> ✅ **Instead:** [Correct approach]

> ⚠️ **Mistake 2:** [Another common pitfall]
> ✅ **Instead:** [Better way]

### 🎯 Quick Self-Check
[One thought-provoking question to test understanding]
[Should require applying the concept, not just recalling it]

FORMATTING REQUIREMENTS:
- Use **bold** for key terms and important points
- Use *italic* for emphasis
- Use LaTeX for ALL mathematical formulas and expressions
- Use bullet points (-) for lists
- Use numbered lists (1., 2., 3.) for sequential steps
- Use > for important notes, tips, or warnings
- Use code blocks (\`\`\`) for special notation if needed
- Structure with clear ### headings for each section`;
};
