import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ClassBandStyles } from './classband.styles';

/**
 * Study Plan Prompt Template (LangChain)
 * Variables: {topic}, {goals}, {timeframe}, {classBand}
 */
export const StudyPlanPromptTemplate = ChatPromptTemplate.fromMessages([
    [
        'user',
        `TASK: Generate a personalized study plan for "{topic}".

GOALS: {goals}
TIMEFRAME: {timeframe}
STYLE: {classBandStyle}

FORMATTING REQUIREMENTS:
- Use Markdown with ## emoji headers for all major sections
- Use Day-by-day or Week-by-week breakdown
- Specific topics to cover
- Recommended practice types (reading, solving, testing)
- Checkpoints for self-assessment
- NO HTML TAGS - pure Markdown only

RESPONSE STRUCTURE:
## 📚 Study Plan Overview

[Brief introduction to what this plan covers]

## 📅 Day-by-Day Breakdown

[Detailed schedule]`,
    ],
]);

/**
 * Legacy function for backward compatibility
 * Enhanced to create comprehensive study plans with focus on weak areas
 * Now generates pure Markdown - frontend transforms to collapsible sections
 * @deprecated Use StudyPlanPromptTemplate.invoke() instead
 */
export const StudyPlanPrompt = (topic: string, goals: string, timeframe: string, classBand: string) => {
    const classBandStyle = ClassBandStyles[classBand];
    return `TASK: Generate a comprehensive, personalized study plan for "${topic}"

GOALS: ${goals}
TIMEFRAME: ${timeframe}
STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis for each major section
2. **Section Format** - Use exactly this format: ## 📚 Section Title
3. **No HTML Tags** - Use pure Markdown only (no <details>, <summary>, or other HTML tags)
4. **Comprehensive Coverage** - Include ALL topics from the chapter/subject
5. **Prioritize Weak Areas** - Based on mastery profile, give MORE time to weak topics
6. **Use Uploaded Materials** - Reference the RAG context to structure the plan around actual study materials
7. **Age-Appropriate Pacing** - Adjust difficulty and pace based on class band
8. **Include Practice** - Mix reading, solving, and testing activities

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📚 Study Plan Overview

[Brief introduction to what this plan covers and the learning objectives]

## 🎯 Topics to Cover

[List ALL topics in order, marking weak areas with ⚠️]
1. Topic 1 (Strong ✅)
2. Topic 2 (Needs Practice ⚠️)
3. Topic 3 (Weak - Priority ⚠️⚠️)

## 📅 Day-by-Day Breakdown

**Day 1: [Topic Name]**
- **Morning (30 min):** Read [specific pages/sections from uploaded material]
- **Afternoon (45 min):** Solve practice problems
- **Evening (15 min):** Quick revision and self-test
- **Focus:** [Why this topic is important]

**Day 2: [Topic Name - Weak Area ⚠️]**
- **Morning (45 min):** Deep dive into concept [reference uploaded material]
- **Afternoon (60 min):** Extra practice on weak areas
- **Evening (20 min):** Review mistakes
- **Focus:** [Special attention to common mistakes]

[Continue for all days/weeks...]

## 📊 Study Activities Mix

- **Reading & Understanding:** 40% (concepts from uploaded books)
- **Problem Solving:** 40% (practice questions)
- **Testing & Revision:** 20% (self-assessment)

## ✅ Checkpoints for Self-Assessment

**After Day 3:**
- [ ] Can explain [concept 1] in your own words
- [ ] Can solve [type of problem] without help
- [ ] Understand the connection between [concept A] and [concept B]

**After Day 5:**
- [ ] Completed all practice problems for weak topics
- [ ] Can teach [difficult concept] to someone else
- [ ] Ready for chapter test

## 💡 Study Tips

- Focus extra time on topics marked with ⚠️
- Review strong topics (✅) briefly to maintain mastery
- Take short breaks between study sessions
- Use active recall instead of passive reading

## 🎓 Success Criteria

By the end of this plan, you should be able to:
1. [Specific learning outcome 1]
2. [Specific learning outcome 2]
3. [Specific learning outcome 3]

PERSONALIZATION NOTES:
- Use ## headers with emojis for all main sections to keep the plan neat and organized
- If mastery profile shows weak areas, allocate 60% time to those topics
- If student is strong overall, include advanced/challenge problems
- Reference specific page numbers and sections from uploaded study materials
- Adjust daily time based on student's grade level and capacity
- NO HTML TAGS - pure Markdown only`;
};
