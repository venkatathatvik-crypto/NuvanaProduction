import { ClassBandStyles } from './classband.styles';

/**
 * Teacher Lesson Plan Prompt
 * Generates comprehensive lesson plans for teachers
 */
export const TeacherLessonPlanPrompt = (
  topic: string,
  subject: string,
  classBand: string,
  duration?: number,
  objectives?: string
) => {
  const classBandStyle = ClassBandStyles[classBand] || ClassBandStyles.middle;
  const lessonDuration = duration || 45; // Default 45 minutes

  return `TASK: Create a comprehensive, structured lesson plan for teaching "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
LESSON DURATION: ${lessonDuration} minutes
TEACHING OBJECTIVES: ${objectives || 'To be determined based on topic'}
AUDIENCE STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your lesson plan using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 📚 Section Title
3. **No HTML Tags** - Use pure Markdown only
4. **Teacher-Focused** - This is for the TEACHER to use, not students
5. **Practical and Actionable** - Include specific activities and timings
6. **Age-Appropriate** - Adjust complexity and activities for the grade level
7. **Include Resources** - List materials, handouts, technology needed
8. **Assessment Built-In** - Include formative and summative assessment methods

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📚 Lesson Overview

**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Duration:** ${lessonDuration} minutes
**Date/Period:** [To be filled by teacher]

## 🎯 Learning Objectives

By the end of this lesson, students will be able to:
1. [Specific, measurable objective 1]
2. [Specific, measurable objective 2]
3. [Specific, measurable objective 3]

**Standards Alignment:** [Mention relevant curriculum standards if applicable]

## 📋 Materials & Resources Needed

**Physical Materials:**
- Item 1 (quantity)
- Item 2 (quantity)

**Technology:**
- Equipment (e.g., projector, laptop)
- Software/Apps needed

**Handouts/Worksheets:**
- [List any prepared materials needed]

**Safety Considerations:** [If applicable for science/lab work]

## 📅 Multi-Day Timetable (${lessonDuration} Days)

**Total Duration:** ${lessonDuration} hours (${lessonDuration} days × 1 hour each)
**Format:** Each day represents 1 hour (60 minutes) of instruction

${Array.from({ length: lessonDuration || 3 }, (_, i) => {
  const dayNum = i + 1;
  return `
---

### Day ${dayNum} - Hour ${dayNum} (60 minutes)

**Daily Focus:** [Main topic/concept for Day ${dayNum}]

**⏰ 0:00-0:10 (10 min) - Opening & Review**
- ${dayNum > 1 ? 'Quick recap of previous day' : 'Introduce topic and objectives'}
- Engage students with warm-up activity
- Set today's learning goals

**⏰ 0:10-0:35 (25 min) - Main Instruction**
- **Core Concept:** [What you'll teach]
- **Method:** [Lecture/Demo/Activity/Video]
- **Key Points:**
  1. [Point 1]
  2. [Point 2]
  3. [Point 3]
- **Visual Aids:** [What to display/use]

**⏰ 0:35-0:50 (15 min) - Guided Practice**
- **Activity:** [What students will do]
- **Grouping:** [Individual/Pairs/Groups]
- **Teacher Role:** Circulate, support, address misconceptions

**⏰ 0:50-1:00 (10 min) - Wrap-Up & Assessment**
- **Quick Check:** [Exit ticket/question]
- **Key Takeaways:** Review main points
- ${dayNum < lessonDuration ? '**Preview:** Brief intro to next day' : '**Unit Wrap-Up:** Overall review'}

**Materials Needed:**
- [List specific materials for this day]

**Homework (Optional):**
- [Brief assignment to reinforce learning]
`;
}).join('\n')}

## 📊 Assessment Strategies

**Formative Assessment (During Lesson):**
- Observation checklist
- Questioning techniques
- Quick checks for understanding

**Summative Assessment (End of Lesson/Unit):**
- [Quiz, test, project, presentation]
- **Success Criteria:** [What constitutes mastery]

## 🎨 Differentiation & Inclusion

**For English Language Learners:**
- [Specific support strategy]

**For Students with Special Needs:**
- [Accommodation examples]

**For Advanced Learners:**
- [Extension activities]

**Multiple Intelligences Addressed:**
- Visual: [How]
- Kinesthetic: [How]
- Auditory: [How]

## 🏠 Homework/Extension

**Assignment:** [If applicable]
**Purpose:** [Why this homework reinforces learning]
**Estimated Time:** [Minutes]

**Optional Extension:** [For interested students]

## 💡 Teacher Notes & Reflection

**Common Student Misconceptions:**
- Misconception 1: [How to address]
- Misconception 2: [How to address]

**Teaching Tips:**
- [Tip 1]
- [Tip 2]

**Time Management:**
- If running short: [What to prioritize]
- If extra time: [Enrichment activities]

**Cross-Curricular Connections:**
- [Links to other subjects]

**Post-Lesson Reflection (To fill after teaching):**
- What worked well?
- What needs adjustment?
- Student engagement level?

## 🔗 Resources & References

**Textbook:** [Chapter/pages if applicable]
**Online Resources:** [Useful websites, videos]
**Additional Reading:** [For teacher background]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for section headings and key terms
- Use bullet points for lists
- Include specific timings for each activity
- Provide concrete examples, not generic advice
- Include teacher scripts or key phrases where helpful
- NO HTML TAGS - pure Markdown only

AGE-APPROPRIATE ADJUSTMENTS:
- **Primary:** Use more concrete examples, shorter activities, hands-on learning
- **Middle:** Balance concrete and abstract, group work, start inquiry-based learning
- **Secondary:** More abstract thinking, independent work, deeper analysis`;
};

/**
 * Legacy function for backward compatibility
 */
export const LessonPlanPrompt = (topic: string, classBand: string, duration?: number) => {
  return TeacherLessonPlanPrompt(topic, 'General', classBand, duration);
};
