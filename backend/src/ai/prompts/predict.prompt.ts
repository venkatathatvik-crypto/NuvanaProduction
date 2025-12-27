import { ClassBandStyles } from './classband.styles';

/**
 * Predict/Exam Prediction Prompt
 * Analyzes past year questions and provides focused revision strategy
 */
export const PredictPrompt = (topic: string, context: string, classBand: string) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  
  return `TASK: Predict high-probability exam questions and topics for "${topic}"

CONTEXT: ${context}
STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 📊 Section Title
3. **No HTML Tags** - Use pure Markdown only
4. **Evidence-Based** - Base predictions ONLY on patterns from RAG context (past papers, teacher materials)
5. **Prioritize Topics** - Rank topics by probability (High/Medium/Low)
6. **Actionable** - Provide specific revision strategies
7. **Realistic** - Don't promise certainty, use probability language

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📊 Exam Prediction Analysis

**Topic:** ${topic}
**Analysis Date:** [Current academic context]
**Confidence Level:** [High/Medium/Low based on available data]

---

## 🎯 High-Probability Topics (70-90% chance)

Based on past year question patterns and teacher emphasis:

1. **[Topic Name]**
   - **Why likely:** [Pattern observed in past papers/materials]
   - **Question types:** [MCQ/Short Answer/Essay]
   - **Key concepts to focus on:** [Specific subtopics]
   - **Revision time:** [Suggested hours/days]

2. **[Topic Name]**
   - **Why likely:** [Evidence from RAG context]
   - **Question types:** [Expected formats]
   - **Key concepts to focus on:** [What to study]
   - **Revision time:** [Time allocation]

---

## ⚡ Medium-Probability Topics (40-60% chance)

Topics that appear regularly but not every year:

1. **[Topic Name]** - [Brief reasoning]
2. **[Topic Name]** - [Brief reasoning]
3. **[Topic Name]** - [Brief reasoning]

---

## 💡 Important Concepts to Master

Regardless of specific questions, these concepts are fundamental:

- **[Concept 1]:** [Why it's important]
- **[Concept 2]:** [Why it's important]
- **[Concept 3]:** [Why it's important]

---

## 📝 Predicted Question Patterns

Based on analysis of past papers:

**Pattern 1: [Type of question]**
- Example: [Sample question based on pattern]
- How to prepare: [Strategy]

**Pattern 2: [Type of question]**
- Example: [Sample question based on pattern]
- How to prepare: [Strategy]

---

## 🎓 Focused Revision Strategy

**Week Before Exam:**
- **Day 1-2:** Focus on [High-probability topics]
- **Day 3-4:** Practice [Specific question types]
- **Day 5-6:** Review [Medium-probability topics]
- **Day 7:** Quick revision of all key formulas/concepts

**Last 24 Hours:**
- Review [Most critical concepts]
- Practice [Common question formats]
- Avoid new topics - consolidate what you know

---

## ⚠️ Important Notes

> **Disclaimer:** These predictions are based on pattern analysis of available materials. Exam questions can vary, so ensure comprehensive preparation across all syllabus topics.

**What to do if RAG context is limited:**
${context === '[NO RELEVANT CONTENT FOUND]' ? 
  '- I don\'t have access to past papers or teacher materials for this topic\n- Please ask your teacher to upload previous year questions\n- Focus on comprehensive syllabus coverage instead of predictions' :
  '- Use these predictions to prioritize, not limit your study\n- Cover all syllabus topics, but spend more time on high-probability areas\n- Practice previous year questions extensively'}

---

## 📚 Study Resources Checklist

- [ ] Reviewed all high-probability topics thoroughly
- [ ] Practiced past year questions (if available)
- [ ] Created summary notes for quick revision
- [ ] Memorized key formulas and definitions
- [ ] Solved sample problems for each pattern
- [ ] Prepared for both expected and unexpected questions

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for important points
- Use bullet points for lists
- Use > for disclaimers and warnings
- Be honest about prediction confidence
- If RAG context shows [NO RELEVANT CONTENT FOUND], clearly state that predictions cannot be made
- NO HTML TAGS - pure Markdown only`;
};
