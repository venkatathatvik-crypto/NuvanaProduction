# Prompt Selection and LLM Flow Explanation

## Overview
This document explains how prompts are selected in the backend based on task type and class band, and how the LLM generates responses.

---

## 🔄 Complete Flow: Request to Response

### Step 1: Request Arrives at Controller
**Location:** `backend/src/ai/ai.controller.ts`

```typescript
@Post('doubt')
async doubt(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
    dto.taskType = AiTaskType.DOUBT;  // Sets task type explicitly
    return this.aiService.processRequest(dto);
}
```

**What happens:**
- Controller receives HTTP POST request with `AiRequestDto`
- Controller explicitly sets `taskType` based on endpoint (e.g., `/ai/doubt` → `DOUBT`)
- Request is forwarded to `AiService.processRequest()`

**Request DTO contains:**
- `taskType`: The AI task (explain, solve, doubt, etc.)
- `query`: Student's question
- `subject`: Selected subject (optional)
- `classBand`: Inferred from class name (primary/middle/high)
- `studentId`: For personalization
- `additionalContext`: Any extra data

---

### Step 2: AI Service Processes Request
**Location:** `backend/src/ai/ai.service.ts`

#### 2.1 Extract Parameters
```typescript
const { taskType, query, subject, classBand, studentId } = dto;
const band = classBand || 'middle';  // Default to 'middle' if not provided
```

**Class Band Values:**
- `'primary'`: Classes 1-5
- `'middle'`: Classes 6-8
- `'high'`: Classes 9-12
- `'advanced'`: University level (rarely used)

#### 2.2 Get Student's Class ID (for RAG filtering)
```typescript
const student = await this.prisma.profiles.findFirst({
    where: { id: studentId },
    include: { student_details: { select: { class_id: true } } }
});
const studentClassId = student?.student_details?.class_id;
```

**Purpose:** Used to filter RAG documents by student's specific class.

#### 2.3 Retrieve RAG Context
```typescript
ragContext = await this.ragService.retrieve(
    query,                    // Student's question
    subject || 'General',     // Subject filter
    band,                     // Class band (for metadata)
    studentClassId            // Class ID (for filtering)
);
```

**What happens:**
- Searches vector database for relevant documents
- Filters by `class_id` and `subject`
- Returns combined text from matching chunks
- If no matches: returns `"[NO RELEVANT CONTENT FOUND]"`

#### 2.4 Get Student Mastery Profile
```typescript
const profile = await this.masteryService.getMasteryProfile(studentId, subject);
// Returns: { overallScore: 0.75, topics: {...} }

// Determine difficulty based on mastery
if (profile.overallScore >= 0.8) difficulty = 'Hard';
else if (profile.overallScore < 0.4) difficulty = 'Easy';
else difficulty = 'Medium';
```

**Purpose:** Personalizes response difficulty and focus areas.

---

### Step 3: Prompt Selection (Based on Task Type)
**Location:** `backend/src/ai/ai.service.ts` (lines 128-162)

The system uses a **switch statement** to select the appropriate prompt template based on `taskType`:

```typescript
switch (taskType) {
    case AiTaskType.EXPLAIN:
        userPrompt = ExplainPrompt(query, band, masteryProfile);
        break;
    case AiTaskType.SOLVE:
        userPrompt = SolvePrompt(query, band);
        break;
    case AiTaskType.DOUBT:
        userPrompt = DoubtPrompt(query, ragContext, band);
        break;
    case AiTaskType.SUMMARY:
        userPrompt = SummaryPrompt(dto.topic || query, band);
        break;
    case AiTaskType.EXPAND:
        userPrompt = ExpandPrompt(dto.topic || query, band);
        break;
    case AiTaskType.STUDY_PLAN:
        userPrompt = StudyPlanPrompt(dto.topic || query, 'Mastery', '1 Week', band);
        break;
    case AiTaskType.PREDICT:
        userPrompt = PredictPrompt(dto.topic || query, 'Key definition focus based on RAG', band);
        break;
    case AiTaskType.MOCK_TEST:
        userPrompt = MockTestPrompt([dto.topic || query], difficulty, '30 mins', band);
        break;
    case AiTaskType.LIFE_SKILL:
        userPrompt = LifeSkillPrompt(query, 'General Growth');
        break;
    default:
        userPrompt = query;  // Fallback: just use the query
}
```

**Key Points:**
- Each task type has its own prompt function
- **Class band (`band`)** is passed to ALL prompts (except `LIFE_SKILL`)
- Some prompts also receive:
  - `masteryProfile` (EXPLAIN)
  - `ragContext` (DOUBT)
  - `difficulty` (MOCK_TEST)

---

### Step 4: How Class Band Affects Prompts
**Location:** `backend/src/ai/prompts/classband.styles.ts`

Class band determines the **teaching style** embedded in prompts:

#### Class Band Styles Dictionary:
```typescript
export const ClassBandStyles = {
  primary: `
    Class 1-5 Style:
    - Language: Simple, short sentences.
    - Analogies: Everyday objects, animals, stories.
    - Formulas: None unless absolutely essential.
    - Tone: Encouraging, teacher-like.
  `,
  middle: `
    Class 6-8 Style:
    - Language: Clear, structured steps.
    - Analogies: Relatable real-world examples.
    - Formulas: Gentle introduction with explanation.
    - Tone: Supportive, guiding.
  `,
  high: `
    Class 9-12 Style:
    - Language: Formal, academic, exam-oriented.
    - Content: Step-by-step derivations, board-style thinking.
    - Formulas: Rigorous use and application.
    - Tone: Professional, focused on exam readiness.
  `,
  advanced: `
    Tone: Scholarly and rigorous.
    Language: University-level, highly technical.
    ...
  `
};
```

#### How It's Used in Prompts:

**Example: ExplainPrompt**
```typescript
export const ExplainPrompt = (concept: string, classBand: string, masteryProfile: string) => `
TASK: Explain the concept of "${concept}".

STYLE: ${ClassBandStyles[classBand] || ClassBandStyles.middle}

CONTEXT: Use the provided RAG content to ensure accuracy.

MASTERY: The student's profile says: ${masteryProfile}. detailed explanation accordingly.
`;
```

**What happens:**
1. Prompt function receives `classBand` (e.g., `'middle'`)
2. Looks up style in `ClassBandStyles[classBand]`
3. Injects style instructions into the prompt
4. LLM receives instructions like: "Use Class 6-8 Style: Clear, structured steps..."

**Result:** Same concept, different explanation style based on class level.

---

### Step 5: Prompt Template Examples

#### 5.1 Explain Prompt
```typescript
ExplainPrompt(query, band, masteryProfile)
```
**Inputs:**
- `query`: "What is photosynthesis?"
- `band`: "middle"
- `masteryProfile`: "Overall Score: 0.75. Topic Mastery: {...}"

**Generated Prompt:**
```
TASK: Explain the concept of "What is photosynthesis?".

STYLE: Class 6-8 Style:
    - Language: Clear, structured steps.
    - Analogies: Relatable real-world examples.
    - Formulas: Gentle introduction with explanation.
    - Tone: Supportive, guiding.

CONTEXT: Use the provided RAG content to ensure accuracy.

MASTERY: The student's profile says: Overall Score: 0.75. Topic Mastery: {...}. detailed explanation accordingly.
```

#### 5.2 Doubt Prompt
```typescript
DoubtPrompt(query, ragContext, band)
```
**Inputs:**
- `query`: "Why do plants need sunlight?"
- `ragContext`: "[Extracted document chunks about photosynthesis]"
- `band`: "primary"

**Generated Prompt:**
```
TASK: Resolve the student's doubt: "Why do plants need sunlight?".

CONTEXT: Reference this material: [Extracted document chunks about photosynthesis]

STYLE: Class 1-5 Style:
    - Language: Simple, short sentences.
    - Analogies: Everyday objects, animals, stories.
    - Formulas: None unless absolutely essential.
    - Tone: Encouraging, teacher-like.

GOAL: Identify the underlying misconception first. Clear the confusion without giving just a dry answer. Use an analogy if helpful.
```

#### 5.3 Solve Prompt
```typescript
SolvePrompt(problem, band)
```
**Inputs:**
- `problem`: "Solve: 2x + 5 = 15"
- `band`: "high"

**Generated Prompt:**
```
TASK: Solve the following problem step-by-step: "Solve: 2x + 5 = 15".

STYLE: Class 9-12 Style:
    - Language: Formal, academic, exam-oriented.
    - Content: Step-by-step derivations, board-style thinking.
    - Formulas: Rigorous use and application.
    - Tone: Professional, focused on exam readiness.

INSTRUCTIONS:
1. Break down the problem.
2. Identify the formula or concept needed.
3. Show the calculation clearly.
4. Explain *why* each step is taken.
```

---

### Step 6: LLM Call Assembly
**Location:** `backend/src/ai/ai.service.ts` (lines 165-172)

After prompt selection, the system assembles messages for the LLM:

```typescript
const rawContent = await this.llmProvider.generate([
    { role: 'system', content: SYSTEM_ROOT_PROMPT },
    { role: 'system', content: `RAG CONTEXT: ${ragContext}` },
    { role: 'user', content: userPrompt }
]);
```

**Message Structure:**
1. **System Message 1:** `SYSTEM_ROOT_PROMPT`
   - Core instructions for the AI
   - Educational boundaries
   - Response structure requirements
   - Personalization rules

2. **System Message 2:** `RAG CONTEXT: [extracted documents]`
   - Ground truth content from teacher-uploaded files
   - Only content relevant to student's class and subject

3. **User Message:** `userPrompt` (task-specific prompt)
   - The actual task (explain, solve, doubt, etc.)
   - Class band style instructions
   - Student's question
   - Mastery profile (if applicable)

---

### Step 7: LLM Provider (Gemini)
**Location:** `backend/src/ai/llm/gemini.provider.ts`

#### 7.1 Message Processing
```typescript
// Combine system messages into one context
let systemContext = '';
for (const msg of messages) {
    if (msg.role === 'system') {
        systemContext += `${msg.content}\n\n`;
    }
}

// Build API payload
contents.push({
    parts: [{ 
        text: `${systemContext.trim()}\n\nUSER TASK:\n${userParts.join('\n')}` 
    }],
});
```

**What happens:**
- All system messages are combined into one context
- User messages are appended after "USER TASK:"
- Sent as a single content block to Gemini API

#### 7.2 API Call
```typescript
const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
        method: 'POST',
        headers: {
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents: contents }),
    }
);
```

**Model Used:**
- Default: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env var)
- Fallback: `gemini-pro`

#### 7.3 Response Extraction
```typescript
const data = await response.json();
const text = data.candidates[0].content.parts[0].text;
return text;  // Raw LLM response
```

---

### Step 8: Response Parsing
**Location:** `backend/src/ai/ai.service.ts` (lines 197-264)

The raw LLM text is parsed into structured format:

```typescript
const parsedResponse = this.parseResponse(rawContent);
```

**Parsing Logic:**
1. Extracts sections using markdown patterns:
   - `### Title` → `title`
   - `### Explanation` → `explanation`
   - `### Key Points` → `keyPoints` (array)
   - `### Personalized Feedback` → `personalizedFeedback`
   - `### Follow-up Question` → `followUpQuestion`

2. Fallbacks if sections not found:
   - Title: First line of response
   - Explanation: Full text if no section found
   - Key Points: Empty array if not found

3. Returns structured `AiResponseDto`:
```typescript
{
    title: "Photosynthesis Explained",
    explanation: "...",
    keyPoints: ["Point 1", "Point 2"],
    personalizedFeedback: "...",
    followUpQuestion: "...",
    rawResponse: "..."
}
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HTTP Request → Controller                               │
│    POST /ai/doubt                                           │
│    Body: { query, subject, classBand, studentId }          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AI Service: Extract Parameters                           │
│    - taskType: DOUBT                                        │
│    - query: "Why do plants need sunlight?"                  │
│    - classBand: "middle" (from class name)                 │
│    - subject: "Biology"                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Get Student Context                                      │
│    - Fetch class_id from database                           │
│    - Get mastery profile (overallScore, topics)             │
│    - Determine difficulty level                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RAG Retrieval                                            │
│    - Search vector DB by class_id + subject                 │
│    - Get relevant document chunks                           │
│    - Combine into ragContext                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Prompt Selection (Switch Statement)                     │
│    taskType = DOUBT                                         │
│    → DoubtPrompt(query, ragContext, band)                   │
│                                                              │
│    Generated Prompt:                                         │
│    - TASK: Resolve doubt: "..."                             │
│    - CONTEXT: [RAG chunks]                                  │
│    - STYLE: ClassBandStyles[band]                           │
│      (e.g., "Class 6-8 Style: Clear, structured...")       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. LLM Message Assembly                                     │
│    Messages:                                                │
│    [                                                          │
│      { role: 'system', content: SYSTEM_ROOT_PROMPT },        │
│      { role: 'system', content: 'RAG CONTEXT: ...' },        │
│      { role: 'user', content: userPrompt }                  │
│    ]                                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Gemini API Call                                          │
│    POST /v1beta/models/gemini-2.5-flash:generateContent    │
│    Headers: x-goog-api-key: [API_KEY]                       │
│    Body: { contents: [{ parts: [{ text: "..." }] }] }       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. LLM Response                                             │
│    Raw text: "### Title\n...\n### Explanation\n..."         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Parse Response                                           │
│    - Extract Title, Explanation, Key Points, etc.            │
│    - Return structured AiResponseDto                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. Return to Frontend                                       │
│     JSON: { title, explanation, keyPoints, ... }             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Points: How Class Band Works

### 1. **Class Band Inference (Frontend)**
- Student's class name (e.g., "Class 8B") is used
- Frontend infers band: `'primary'`, `'middle'`, or `'high'`
- Sent in request as `classBand` field

### 2. **Class Band Usage (Backend)**
- **Every prompt function** receives `band` parameter
- Prompt looks up style: `ClassBandStyles[band]`
- Style instructions are **injected into the prompt**
- LLM receives explicit style guidance

### 3. **Style Impact**
- **Primary (1-5):** Simple language, no formulas, story analogies
- **Middle (6-8):** Clear steps, gentle formulas, real-world examples
- **High (9-12):** Formal tone, rigorous formulas, exam-oriented

### 4. **Example Comparison**

**Same Question, Different Bands:**

**Primary Band:**
```
"Photosynthesis is like a plant's kitchen! 
Plants use sunlight to make food, just like you 
use a stove to cook. The sun is like the stove's 
heat, and the plant's leaves are like the pan."
```

**High Band:**
```
"Photosynthesis is a biochemical process occurring 
in chloroplasts where light energy is converted to 
chemical energy. The reaction follows: 
6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. 
This process is critical for autotrophic nutrition 
and is a key topic in board examinations."
```

---

## 🔍 Prompt Selection Logic Summary

| Task Type | Prompt Function | Parameters | Class Band Used? |
|-----------|----------------|------------|------------------|
| EXPLAIN | `ExplainPrompt` | query, band, masteryProfile | ✅ Yes |
| SOLVE | `SolvePrompt` | problem, band | ✅ Yes |
| DOUBT | `DoubtPrompt` | doubt, context, band | ✅ Yes |
| SUMMARY | `SummaryPrompt` | topic, band | ✅ Yes |
| EXPAND | `ExpandPrompt` | topic, band | ✅ Yes |
| STUDY_PLAN | `StudyPlanPrompt` | topic, mastery, duration, band | ✅ Yes |
| PREDICT | `PredictPrompt` | topic, patterns, band | ✅ Yes |
| MOCK_TEST | `MockTestPrompt` | topics, difficulty, duration, band | ✅ Yes |
| LIFE_SKILL | `LifeSkillPrompt` | query, category | ❌ No |

---

## 📝 System Prompt (SYSTEM_ROOT_PROMPT)

The system prompt provides:
- Core educational boundaries
- RAG usage rules
- Personalization requirements
- Class band adaptation rules
- Response structure requirements
- Quality checks

**Key Instruction:**
```
Class 1–5 (Primary): Simple language, Short sentences, Everyday analogies
Class 6–8 (Middle): Clear steps, Gentle introduction of formulas
Class 9–12 (High): Formal academic tone, Step-by-step derivations
```

This reinforces the class band styles in every response.

---

## 🎓 Conclusion

**Prompt Selection Flow:**
1. Task type determines which prompt function to call
2. Class band determines teaching style (from `ClassBandStyles`)
3. Prompt function injects style into the prompt template
4. LLM receives: System instructions + RAG context + Task-specific prompt (with style)
5. LLM generates response following the style guidelines

**Class Band Impact:**
- Same concept, different explanation complexity
- Same question, different language level
- Same task, different depth of detail

The system ensures that a Class 5 student and a Class 12 student asking the same question receive age-appropriate explanations.

