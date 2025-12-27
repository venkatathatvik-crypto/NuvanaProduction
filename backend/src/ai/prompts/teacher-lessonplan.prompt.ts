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
1. **Use Markdown Sections** - Structure your lesson plan using ### headers with emojis
2. **Detailed Content** - This is for the TEACHER to use, not students.
3. **No HTML Tags** - Pure Markdown only.
4. **Practical and Actionable** - Include specific activities and timings.
5. **Age-Appropriate** - Adjust complexity and activities for the grade level.

RESPONSE STRUCTURE (Strictly follow this with ### headers):

### Title
Lesson Plan: ${topic} (${subject})

### Explanation
Below is a structured lesson plan designed for ${classBand} students. It covers learning objectives, materials, assessment strategies, and a detailed timetable.

### Detailed Content

### 📚 Lesson Overview
**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Duration:** ${lessonDuration} minutes

### 🎯 Learning Objectives
By the end of this lesson, students will be able to:
1. [Specific, measurable objective 1]
2. [Specific, measurable objective 2]
3. [Specific, measurable objective 3]

### 📋 Materials & Resources Needed
**Physical Materials:**
- Item 1 (quantity)
- Item 2 (quantity)

**Technology:**
- Equipment (e.g., projector, laptop)
- Software/Apps needed

### 📅 Multi-Day Timetable (${lessonDuration} Days)
${Array.from({ length: lessonDuration || 3 }, (_, i) => {
  const dayNum = i + 1;
  return `
---

#### Day ${dayNum} - Hour ${dayNum} (60 minutes)
**Daily Focus:** [Main topic/concept for Day ${dayNum}]

**⏰ 0:00-0:10** - Opening & Review
**⏰ 0:10-0:35** - Main Instruction
**⏰ 0:35-0:50** - Guided Practice
**⏰ 0:50-1:00** - Wrap-Up & Assessment
`;
}).join('\n')}

### 📊 Assessment Strategies
- Formative Assessment (During Lesson)
- Summative Assessment (End of Lesson/Unit)

### 🎨 Differentiation & Inclusion
- For English Language Learners: [Specific strategy]
- For Students with Special Needs: [Specific strategy]
- For Advanced Learners: [Extension activities]

### 💡 Teacher Notes & Reflection
**Common Student Misconceptions:**
- Misconception 1: [How to address]
- Misconception 2: [How to address]

**Teaching Tips:**
- [Tip 1]
- [Tip 2]

**Time Management:**
- If running short: [What to prioritize]
- If extra time: [Enrichment activities]`;
};

/**
 * Legacy function for backward compatibility
 */
export const LessonPlanPrompt = (topic: string, classBand: string, duration?: number) => {
  return TeacherLessonPlanPrompt(topic, 'General', classBand, duration);
};
