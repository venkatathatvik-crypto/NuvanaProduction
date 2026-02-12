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
  
  // Duration parameter represents NUMBER OF DAYS for the lesson plan
  const numberOfDays = duration || 3; // Default 3-day lesson plan
  const lessonDurationMinutes = 60; // Each lesson is 60 minutes
  const lessonDuration = duration || 45; // Legacy for compatibility

  return `TASK: Create a comprehensive, structured lesson plan for teaching "${topic}"

SUBJECT: ${subject}
GRADE LEVEL: ${classBand}
LESSON DURATION: ${lessonDurationMinutes} minutes per day
NUMBER OF DAYS: ${numberOfDays} days
TEACHING OBJECTIVES: ${objectives || 'To be determined based on topic'}
AUDIENCE STYLE: ${classBandStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your lesson plan using ## headers with emojis
2. **Generate Actual Content** - DO NOT describe what the plan should contain - CREATE the actual plan
3. **No HTML Tags** - Pure Markdown only
4. **Practical and Actionable** - Include specific activities and timings
5. **Age-Appropriate** - Adjust complexity and activities for the grade level
6. **Multi-Day Plan** - Create a ${numberOfDays}-day lesson plan, with each day being ${lessonDurationMinutes} minutes
7. **Analytics-Driven** - Check the "ANALYTICS CONTEXT" in the system prompt. If class-wide topic mastery or subject averages are available, emphasize and spend more time on "Topics Needing Attention" while still covering the main topic.

⚠️ **CRITICAL:** Do NOT write "Below is a lesson plan..." - WRITE THE ACTUAL LESSON PLAN DIRECTLY!

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 📚 Lesson Overview

**Topic:** ${topic}
**Subject:** ${subject}
**Grade Level:** ${classBand}
**Total Duration:** ${numberOfDays} days (${lessonDurationMinutes} minutes per day)

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

### 📅 Multi-Day Timetable

**IMPORTANT:** Generate a detailed timetable for ${numberOfDays} days. Each day should be a complete 60-minute lesson with the structure shown below.

For each day (Day 1, Day 2, Day 3... up to Day ${numberOfDays}), create:

---

#### Day [Number] - [Topic for this day] (60 minutes)
**Daily Focus:** [Main concept/skill to be taught this day]

**⏰ 0:00-0:10 (10 min)** - Opening & Review
- [Specific activity: warm-up, review previous day, introduce today's objective]

**⏰ 0:10-0:35 (25 min)** - Main Instruction
- [Specific teaching activities: direct instruction, demonstrations, examples]
- [Key concepts to cover]

**⏰ 0:35-0:50 (15 min)** - Guided Practice
- [Specific practice activities: worksheets, group work, problem-solving]
- [Teacher circulates and provides support]

**⏰ 0:50-1:00 (10 min)** - Wrap-Up & Assessment
- [Quick assessment: exit ticket, Q&A, summary]
- [Preview next day's lesson]

**Homework:** [Specific assignment for this day]

---

**REPEAT THIS STRUCTURE FOR ALL ${numberOfDays} DAYS** with different topics and activities for each day.

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
