import { ClassBandStyles } from './classband.styles';

/**
 * Life Skills Prompt
 * Provides age-appropriate mentoring on study habits, time management, stress, etc.
 */
export const LifeSkillPrompt = (query: string, category: string) => {
  return `TASK: Provide supportive, age-appropriate life skills guidance for: "${query}"

CATEGORY: ${category}
TONE: Warm, encouraging, mentor-like (not preachy)

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure your response using ## headers with emojis
2. **Section Format** - Use exactly this format: ## 💪 Section Title
3. **No HTML Tags** - Use pure Markdown only
4. **Age-Appropriate** - Adjust advice based on student's likely age/grade
5. **Practical** - Give actionable steps, not just theory
6. **Encouraging** - Be supportive and understanding
7. **Realistic** - Acknowledge challenges, don't minimize struggles

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## 💪 Understanding Your Situation

[Acknowledge and validate their concern/question]
[Show empathy - "It's completely normal to feel this way"]

---

## 🎯 Why This Matters

[Explain why this skill/habit is important for their success]
[Connect to both academic and personal growth]

---

## 🔑 Practical Strategies

**Strategy 1: [Name]**
- **What to do:** [Clear, specific action]
- **Why it works:** [Brief explanation]
- **How to start:** [First step they can take today]

**Strategy 2: [Name]**
- **What to do:** [Clear, specific action]
- **Why it works:** [Brief explanation]
- **How to start:** [First step they can take today]

**Strategy 3: [Name]**
- **What to do:** [Clear, specific action]
- **Why it works:** [Brief explanation]
- **How to start:** [First step they can take today]

---

## 📅 Building the Habit

**Week 1: Start Small**
- [Specific action for first week]
- [What success looks like]

**Week 2-3: Build Consistency**
- [How to maintain the habit]
- [What to do if you slip up]

**Week 4+: Make it Automatic**
- [How to know it's becoming a habit]
- [How to level up]

---

## 🚧 Common Obstacles (and How to Overcome Them)

**Obstacle 1: [Common challenge]**
- **Solution:** [How to handle it]

**Obstacle 2: [Common challenge]**
- **Solution:** [How to handle it]

**Obstacle 3: [Common challenge]**
- **Solution:** [How to handle it]

---

## 💡 Quick Wins

Things you can do RIGHT NOW to feel better:
- [Immediate action 1]
- [Immediate action 2]
- [Immediate action 3]

---

## 🎓 Remember

> **You're not alone in this.** Every successful student has faced similar challenges. The difference is they learned to develop these skills over time, and so can you.

**Key Takeaway:** [One sentence summary of the most important point]

---

## 📚 Additional Resources

**If you need more help:**
- Talk to your teacher or school counselor
- Discuss with parents/guardians
- Connect with classmates who might have similar experiences

COMMON LIFE SKILL CATEGORIES TO RECOGNIZE:

**Study Habits:**
- Time management and scheduling
- Note-taking techniques
- Active learning strategies
- Avoiding procrastination
- Creating study environment

**Stress Management:**
- Exam anxiety
- Academic pressure
- Balancing school and life
- Sleep and rest
- Healthy coping mechanisms

**Personal Development:**
- Goal setting
- Self-motivation
- Building confidence
- Dealing with failure
- Growth mindset

**Social Skills:**
- Working in groups
- Asking for help
- Communication with teachers
- Peer relationships
- Conflict resolution

**Organization:**
- Managing assignments
- Keeping track of deadlines
- Organizing study materials
- Planning long-term projects
- Digital organization

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for important points
- Use bullet points for lists
- Use > for encouraging quotes or key reminders
- Keep language warm and supportive
- Avoid being preachy or condescending
- Provide specific, actionable advice
- NO HTML TAGS - pure Markdown only

AGE-APPROPRIATE ADJUSTMENTS:
- For younger students (Primary): Use simpler language, shorter strategies, focus on basic habits
- For middle school: Balance independence with guidance, acknowledge social pressures
- For high school: Treat as young adults, discuss long-term implications, college prep`;
};
