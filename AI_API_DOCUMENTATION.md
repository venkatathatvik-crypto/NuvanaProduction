# AI API Documentation

## Overview

The AI API provides intelligent, personalized educational assistance powered by Google Gemini. It combines:
- **RAG (Retrieval-Augmented Generation)** - Grounds answers in school-approved content
- **Student Mastery Analysis** - Personalizes responses based on performance
- **Topic Importance** - Prioritizes recommendations based on exam weight
- **Class Band Adaptation** - Adjusts language for different grade levels

---

## Base URL

```
http://localhost:3000/ai
```

**Note:** All endpoints are currently public (no authentication required). This may change in future versions.

---

## Available Endpoints

### 1. Explain Concept
**Endpoint:** `POST /ai/explain`

**Purpose:** Explain a concept clearly with examples

**Request Body:**
```json
{
  "query": "How does photosynthesis work?",
  "subject": "Biology",
  "topic": "Photosynthesis",
  "classBand": "high",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Understanding Photosynthesis",
  "keyPoints": [
    "Photosynthesis converts light energy into chemical energy",
    "Occurs in chloroplasts of plant cells",
    "Produces glucose and oxygen"
  ],
  "explanation": "Photosynthesis is a vital process...",
  "personalizedFeedback": "Based on your performance, you're strong in this area!",
  "followUpQuestion": "Can you explain where photosynthesis occurs in the cell?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Explain the water cycle"
- "What is photosynthesis?"
- "How do cells divide?"
- "Explain Newton's laws of motion"

---

### 2. Solve Problem
**Endpoint:** `POST /ai/solve`

**Purpose:** Solve a problem step-by-step

**Request Body:**
```json
{
  "query": "Solve: 2x + 5 = 15",
  "subject": "Mathematics",
  "topic": "Algebra",
  "classBand": "middle"
}
```

**Response:**
```json
{
  "title": "Solving Linear Equation",
  "keyPoints": [
    "Isolate the variable",
    "Apply inverse operations",
    "Check your answer"
  ],
  "explanation": "To solve 2x + 5 = 15...",
  "personalizedFeedback": null,
  "followUpQuestion": "Can you solve: 3x - 7 = 14?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Solve: x² + 5x + 6 = 0"
- "Find the area of a circle with radius 5cm"
- "Calculate 25% of 80"
- "Solve this equation: 3x + 2 = 11"

---

### 3. Answer Doubt
**Endpoint:** `POST /ai/doubt`

**Purpose:** Clarify student confusion or misconceptions

**Request Body:**
```json
{
  "query": "I don't understand why we need mitochondria",
  "subject": "Biology",
  "topic": "Cell Biology",
  "classBand": "middle",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Understanding Mitochondria",
  "keyPoints": [
    "Mitochondria are the powerhouses of cells",
    "They produce ATP energy",
    "Essential for cellular respiration"
  ],
  "explanation": "Great question! Mitochondria are important because...",
  "personalizedFeedback": "This is a common area of confusion. Let me clarify...",
  "followUpQuestion": "What would happen if a cell had no mitochondria?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "I'm confused about why negative times negative is positive"
- "I don't understand the difference between mitosis and meiosis"
- "Why do we need to learn algebra?"
- "Can you explain why water expands when it freezes?"

---

### 4. Summarize Content
**Endpoint:** `POST /ai/summary`

**Purpose:** Create concise summary notes

**Request Body:**
```json
{
  "query": "Summarize the chapter on World War II",
  "subject": "History",
  "topic": "World War II",
  "classBand": "high"
}
```

**Response:**
```json
{
  "title": "World War II Summary",
  "keyPoints": [
    "1939-1945 global conflict",
    "Major powers: Allies vs Axis",
    "Key events: Pearl Harbor, D-Day, Atomic bombs"
  ],
  "explanation": "World War II was a global war...",
  "personalizedFeedback": null,
  "followUpQuestion": "What were the main causes of World War II?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Summarize the chapter on Photosynthesis"
- "Give me a summary of the French Revolution"
- "Summarize the periodic table basics"
- "Create a summary of the water cycle"

---

### 5. Expand Topic
**Endpoint:** `POST /ai/expand`

**Purpose:** Provide deeper understanding of a topic

**Request Body:**
```json
{
  "query": "Tell me more about quantum physics",
  "subject": "Physics",
  "topic": "Quantum Mechanics",
  "classBand": "high"
}
```

**Response:**
```json
{
  "title": "Exploring Quantum Physics",
  "keyPoints": [
    "Quantum mechanics describes atomic and subatomic particles",
    "Key principles: uncertainty, superposition, entanglement",
    "Applications in technology and computing"
  ],
  "explanation": "Quantum physics is a fascinating field...",
  "personalizedFeedback": null,
  "followUpQuestion": "How does quantum computing differ from classical computing?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Expand on the concept of evolution"
- "Tell me more about the Renaissance period"
- "Explain more about chemical bonding"
- "Go deeper into the topic of climate change"

---

### 6. Study Plan
**Endpoint:** `POST /ai/studyplan`

**Purpose:** Generate personalized study plan

**Request Body:**
```json
{
  "query": "Create a study plan for Mathematics",
  "subject": "Mathematics",
  "topic": "Algebra",
  "classBand": "high",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Personalized Math Study Plan",
  "keyPoints": [
    "Week 1: Focus on Algebra fundamentals",
    "Week 2: Practice quadratic equations",
    "Week 3: Review geometry concepts",
    "Week 4: Mixed practice and revision"
  ],
  "explanation": "Based on your performance, here's a tailored study plan...",
  "personalizedFeedback": "You're strong in geometry but need more practice in algebra",
  "followUpQuestion": "Which topic would you like to start with?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Create a study plan for my science exam"
- "Help me plan my revision for the history test"
- "Generate a study schedule for mathematics"
- "Plan my preparation for the chemistry exam"

---

### 7. Predict Performance
**Endpoint:** `POST /ai/predict`

**Purpose:** Predict exam performance based on past data

**Request Body:**
```json
{
  "query": "Predict my exam performance",
  "subject": "Mathematics",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Exam Performance Prediction",
  "keyPoints": [
    "Strong performance in Algebra (85%)",
    "Need improvement in Geometry (60%)",
    "Overall predicted score: 75%"
  ],
  "explanation": "Based on your recent test scores...",
  "personalizedFeedback": "You're showing strong progress! Focus on geometry for better results.",
  "followUpQuestion": "Would you like a study plan to improve your weak areas?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "How will I perform in the upcoming exam?"
- "Predict my science test score"
- "What's my expected performance in mathematics?"
- "Can you predict my exam results?"

---

### 8. Mock Test
**Endpoint:** `POST /ai/mocktest`

**Purpose:** Generate practice test questions

**Request Body:**
```json
{
  "query": "Generate a mock test on Calculus",
  "subject": "Mathematics",
  "topic": "Calculus",
  "classBand": "high",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Calculus Mock Test",
  "keyPoints": [
    "Question 1: Find the derivative of f(x) = x² + 3x",
    "Question 2: Calculate the integral of 2x",
    "Question 3: Solve the limit as x approaches 0"
  ],
  "explanation": "Here's a practice test to help you prepare...",
  "personalizedFeedback": "Based on your mastery, these questions match your level",
  "followUpQuestion": "Would you like solutions after attempting?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "Create a mock test on photosynthesis"
- "Generate practice questions for algebra"
- "Give me a test on World War II"
- "Create a chemistry practice test"

---

### 9. Life Skills
**Endpoint:** `POST /ai/lifeskill`

**Purpose:** Provide life skills and general guidance

**Request Body:**
```json
{
  "query": "How to manage stress during exams",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "title": "Managing Exam Stress",
  "keyPoints": [
    "Practice deep breathing exercises",
    "Maintain a regular sleep schedule",
    "Break study sessions into manageable chunks",
    "Stay physically active"
  ],
  "explanation": "Exam stress is normal, but here are strategies...",
  "personalizedFeedback": "Remember, you've prepared well. Trust your preparation!",
  "followUpQuestion": "What specific stress management technique would you like to try?",
  "rawResponse": "..."
}
```

**Example Prompts:**
- "How to improve my focus while studying?"
- "Tips for better time management"
- "How to stay motivated during exams?"
- "Advice on building confidence"

---

## Request DTO

```typescript
{
  taskType?: string;        // Optional - set by endpoint
  query: string;            // Required - user's question/request
  subject?: string;         // Optional - subject name (e.g., "Mathematics")
  topic?: string;           // Optional - specific topic (e.g., "Algebra")
  classBand?: string;       // Optional - "primary", "middle", "high", "advanced"
  studentId?: string;       // Optional - UUID of student (for personalization)
  additionalContext?: any;  // Optional - extra context
}
```

## Response DTO

```typescript
{
  title: string;                    // Response title
  keyPoints: string[];               // Bullet points
  explanation: string;               // Main explanation
  personalizedFeedback?: string;     // Student-specific feedback
  followUpQuestion?: string;         // Suggested next question
  rawResponse?: string;              // Full LLM response
  metadata?: any;                    // Additional metadata
}
```

---

## Class Bands

The `classBand` parameter adjusts language and complexity:

- **primary** (Classes 1-5): Simple language, short sentences, everyday analogies
- **middle** (Classes 6-8): Clear steps, gentle introduction of formulas
- **high** (Classes 9-12): Formal academic tone, step-by-step derivations
- **advanced**: Complex concepts, detailed explanations

---

## Personalization

When `studentId` is provided, the AI:
- Analyzes student's test performance
- Identifies weak and strong topics
- Adjusts difficulty level
- Provides personalized feedback
- Prioritizes topics based on importance and mastery

**Example:**
- Student strong in Algebra (90%) but weak in Geometry (40%)
- AI focuses explanations on Geometry
- Study plans prioritize Geometry practice

---

## RAG (Retrieval-Augmented Generation)

When RAG is enabled:
- AI searches uploaded school content
- Answers are grounded in approved materials
- If no relevant content found, AI politely declines
- Prevents hallucination beyond syllabus

**Status:** RAG requires:
- ✅ EmbeddingService enabled (Gemini API key)
- ✅ pgvector extension installed
- ⚠️ Documents uploaded to vector database (future feature)

---

## Error Handling

### Common Errors

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": ["query should not be empty"],
  "error": "Bad Request"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Failed to generate AI response: Gemini model not initialized. Check GEMINI_API_KEY."
}
```

### Graceful Degradation

- **No student data:** Returns neutral mastery (0.5)
- **No RAG content:** Continues without context
- **Embedding unavailable:** Skips RAG, uses LLM only
- **Missing subject:** Uses "General" as default

---

## Best Practices

### 1. Always Provide Context
```json
{
  "query": "Explain photosynthesis",
  "subject": "Biology",        // ✅ Better
  "classBand": "middle",        // ✅ Better
  "studentId": "..."           // ✅ For personalization
}
```

### 2. Use Appropriate Task Types
- Use `explain` for concepts
- Use `solve` for problems
- Use `doubt` for confusion
- Use `studyplan` for planning

### 3. Include Student ID for Personalization
```json
{
  "query": "...",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"  // ✅ Enables personalization
}
```

### 4. Specify Subject for Better RAG
```json
{
  "query": "...",
  "subject": "Mathematics"  // ✅ Helps RAG find relevant content
}
```

---

## Example cURL Requests

### Explain Concept
```bash
curl -X POST http://localhost:3000/ai/explain \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does photosynthesis work?",
    "subject": "Biology",
    "classBand": "middle",
    "studentId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Solve Problem
```bash
curl -X POST http://localhost:3000/ai/solve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Solve: 2x + 5 = 15",
    "subject": "Mathematics",
    "classBand": "middle"
  }'
```

### Study Plan
```bash
curl -X POST http://localhost:3000/ai/studyplan \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a study plan for Mathematics",
    "subject": "Mathematics",
    "studentId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Response Format Examples

### Successful Response
```json
{
  "title": "Understanding Photosynthesis",
  "keyPoints": [
    "Process converts light to energy",
    "Occurs in plant cells",
    "Produces glucose and oxygen"
  ],
  "explanation": "Photosynthesis is a vital biological process...",
  "personalizedFeedback": "Great question! Based on your performance...",
  "followUpQuestion": "Can you explain where this occurs?",
  "rawResponse": "### Title\nUnderstanding Photosynthesis\n\n### Key Points\n..."
}
```

### Error Response
```json
{
  "statusCode": 500,
  "message": "Failed to generate AI response: Gemini model not initialized. Check GEMINI_API_KEY.",
  "error": "Internal Server Error"
}
```

---

## Testing Checklist

- [ ] API key configured in `.env`
- [ ] Backend server running on port 3000
- [ ] Test `/ai/explain` endpoint
- [ ] Test with `studentId` for personalization
- [ ] Test with different `classBand` values
- [ ] Verify error handling
- [ ] Check response structure

---

## Notes

- All endpoints are currently public (no JWT required)
- Responses are generated in real-time
- Mastery data comes from graded tests only
- RAG requires documents to be uploaded (future feature)
- Embedding dimension: 768 (Gemini text-embedding-004)

---

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Verify `GEMINI_API_KEY` is set correctly
3. Ensure database connection is working
4. Check that student has graded test data (for personalization)

