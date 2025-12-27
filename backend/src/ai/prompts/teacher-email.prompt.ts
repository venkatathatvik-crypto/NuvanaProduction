import { ClassBandStyles } from './classband.styles';

/**
 * Email Draft Prompt for Teachers
 * Generates professional emails for various school communication needs
 */
export const TeacherEmailPrompt = (
  purpose: string,
  context: string,
  recipient?: string,
  tone?: 'formal' | 'professional-friendly' | 'urgent'
) => {
  const toneStyle = tone === 'formal' 
    ? 'Highly formal and professional' 
    : tone === 'urgent'
    ? 'Professional with a sense of urgency'
    : 'Professional yet warm and approachable';

  return `TASK: Draft a professional email for a teacher.

PURPOSE: ${purpose}
CONTEXT: ${context}
RECIPIENT: ${recipient || 'To be determined based on context'}
TONE: ${toneStyle}

CRITICAL INSTRUCTIONS:
1. **Use Markdown Sections** - Structure the email using ## headers with emojis
2. **Section Format** - Use exactly this format: ## ✉️ Section Title
3. **No HTML Tags** - Use pure Markdown only
4. **Professional Format** - Proper email structure with greeting, body, closing
5. **Clear and Concise** - Get to the point while maintaining professionalism
6. **Actionable** - Include clear next steps or requests
7. **Respectful Tone** - Always courteous and professional

RESPONSE STRUCTURE (use this exact format with ## emoji headers):

## ✉️ Email Subject

[Clear, professional subject line - 5-10 words maximum]

## 📧 Email Draft

**To:** [Recipient name/role]

**Dear [Name/Title],**

[Opening greeting - warm and professional]

**Purpose:**
[State the main purpose clearly in 1-2 sentences]

**Details:**
[Provide necessary context and information]
- Point 1 (if applicable)
- Point 2 (if applicable)

**Request/Next Steps:**
[Clearly state what you need or the next action items]

**Closing:**
[Thank them for their time/cooperation]

Best regards,
[Teacher Name]
[Subject/Grade]

## 💡 Email Tips

- **Best time to send:** [Morning/Afternoon] for better response rates
- **Follow-up:** [When to follow up if no response]
- **Tone check:** [This email is ${toneStyle.toLowerCase()}]

## 📋 Alternative Versions (Optional)

**Shorter version:** [If a more concise email would work]
**More formal version:** [If higher formality is needed]

FORMATTING REQUIREMENTS:
- Use ## headers with emojis for ALL major sections
- Use **bold** for important points
- Use bullet points for lists
- Keep paragraphs short (2-3 sentences max)
- Professional salutation and closing
- Clear subject line
- NO HTML TAGS - pure Markdown only

COMMON EMAIL TYPES TO RECOGNIZE:
- **Parent Communication:** Progress updates, concerns, meeting requests
- **Leave Request:** Sick leave, personal day, professional development
- **Meeting Request:** Colleague collaboration, parent-teacher meeting
- **Administration:** Resource requests, policy clarification
- **Professional Development:** Workshop requests, training opportunities`;
};

/**
 * Legacy function for backward compatibility
 */
export const EmailDraftPrompt = (context: string, purpose: string) => {
  return TeacherEmailPrompt(purpose, context, undefined, 'professional-friendly');
};
