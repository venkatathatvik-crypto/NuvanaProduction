# AI Query Flow: Frontend to Backend and Back

## Complete Request-Response Flow

### 📱 **Step 1: Student Types Question (Frontend)**

**Location:** `src/components/AiTutor/AiTutorChat.tsx`

```typescript
// Student types: "What is photosynthesis?"
const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input; // "What is photosynthesis?"
    
    // Logs:
    console.log('[AiTutorChat] 📤 User sending message');
    console.log('[AiTutorChat] Message:', textToSend);
    console.log('[AiTutorChat] Student Data:', studentData);
    
    // Build AI request
    const aiRequest: AiRequestDto = {
        taskType: 'doubt', // or 'explain', 'solve', etc.
        query: textToSend, // "What is photosynthesis?"
        studentId: profile?.id, // Student's UUID
        subject: selectedSubject || undefined, // "Biology" (if selected)
        classBand: inferClassBand(studentData?.class_name), // "middle"
    };
    
    // Call AI service
    const aiResponseEncoded = await aiService.processRequest(aiRequest);
}
```

**What happens:**
- Student types question in chat input
- Component gets student data (class_id, class_name)
- Infers class band from class name
- Builds request object with all context

---

### 🌐 **Step 2: Frontend AI Service (HTTP Request)**

**Location:** `src/services/aiService.ts`

```typescript
export const aiService = {
    async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
        // Logs:
        console.log('[Frontend AI Service] 🚀 Sending AI request');
        console.log('[Frontend AI Service] Task Type:', dto.taskType);
        console.log('[Frontend AI Service] Query:', dto.query);
        
        // Import apiClient (handles authentication automatically)
        const { apiClient } = await import('@/lib/apiClient');
        
        // Convert task type to endpoint
        const endpoint = `/ai/${dto.taskType.replace('_', '')}`;
        // Example: '/ai/doubt' or '/ai/explain'
        
        // Send POST request with authentication
        const response = await apiClient.post<AiResponseDto>(endpoint, dto);
        // apiClient automatically adds:
        // - Authorization: Bearer <JWT_TOKEN>
        // - Content-Type: application/json
        
        return response;
    }
};
```

**What happens:**
- Uses `apiClient` which automatically:
  - Adds JWT token from localStorage
  - Handles token refresh if expired
  - Sets proper headers
- Sends POST request to backend
- Endpoint: `POST http://localhost:3000/ai/doubt`

**Request Body:**
```json
{
  "taskType": "doubt",
  "query": "What is photosynthesis?",
  "studentId": "uuid-of-student",
  "subject": "Biology",
  "classBand": "middle"
}
```

---

### 🔐 **Step 3: Authentication & Authorization (Backend)**

**Location:** `backend/src/ai/ai.controller.ts`

```typescript
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard) // 👈 Authentication required
export class AiController {
    
    @Post('doubt')
    @Roles('student', 'teacher', 'school_admin', 'super_admin') // 👈 Role check
    async doubt(@Body() dto: AiRequestDto): Promise<AiResponseDto> {
        console.log(`[AI Controller] POST /ai/doubt - Request received`);
        
        // JwtAuthGuard validates:
        // 1. Token exists in Authorization header
        // 2. Token is valid and not expired
        // 3. Extracts user info (user.sub = studentId, user.role, user.school_id)
        
        // RolesGuard checks:
        // 1. User role matches allowed roles
        
        dto.taskType = AiTaskType.DOUBT;
        return this.aiService.processRequest(dto);
    }
}
```

**What happens:**
- `JwtAuthGuard` validates JWT token
- `RolesGuard` checks if user has required role
- If valid, request proceeds to AI Service
- If invalid, returns 401 Unauthorized

---

### 🧠 **Step 4: AI Service Processing (Backend)**

**Location:** `backend/src/ai/ai.service.ts`

```typescript
async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
    console.log(`[AI Service] 🚀 New AI Request Received`);
    
    // Step 0: Get Student's Class ID
    const student = await this.prisma.profiles.findFirst({
        where: { id: studentId },
        include: { student_details: { select: { class_id: true } } }
    });
    const studentClassId = student?.student_details?.class_id;
    // Example: "d909b6f1-6382-4333-b58e-a267cdcc20e0"
    
    // Step 1: RAG Context Retrieval
    const ragContext = await this.ragService.retrieve(
        query,                    // "What is photosynthesis?"
        subject || 'General',     // "Biology"
        classBand,               // "middle"
        studentClassId           // "d909b6f1-..." (filters by class)
    );
    // Returns: Relevant chunks from PDFs uploaded for this class
    
    // Step 2: Get Student Mastery Profile
    const masteryProfile = await this.masteryService.getMasteryProfile(
        studentId, 
        subject
    );
    // Returns: { overallScore: 0.75, topics: {...} }
    
    // Step 3: Select Prompt Template
    const userPrompt = DoubtPrompt(query, ragContext, classBand);
    
    // Step 4: Call Gemini LLM
    const rawContent = await this.llmProvider.generate([
        { role: 'system', content: SYSTEM_ROOT_PROMPT },
        { role: 'system', content: `RAG CONTEXT: ${ragContext}` },
        { role: 'user', content: userPrompt }
    ]);
    
    // Step 5: Parse Response
    const parsedResponse = this.parseResponse(rawContent);
    
    return parsedResponse; // Returns to controller
}
```

**What happens:**
1. Gets student's class_id from database
2. Searches RAG for relevant content (filtered by class + subject)
3. Gets student's mastery profile (performance data)
4. Builds prompt with all context
5. Calls Gemini LLM
6. Parses response into structured format

---

### 🔍 **Step 5: RAG Service Retrieval (Backend)**

**Location:** `backend/src/ai/rag/rag.service.ts`

```typescript
async retrieve(query: string, subject: string, classBand: string, classId?: string) {
    console.log(`[RAG] Starting retrieval - Query: "${query}", ClassID: "${classId}"`);
    
    // 1. Generate query embedding
    const queryVector = await this.embeddingService.generateQueryEmbedding(query);
    // Returns: [0.123, -0.456, 0.789, ...] (768 dimensions)
    
    // 2. Search vector database
    const result = await this.pool.query(`
        SELECT content, 1 - (embedding <=> $1::vector) as similarity 
        FROM documents 
        WHERE metadata->>'class_id' = $2 
        AND metadata->>'subject' = $3
        ORDER BY similarity DESC 
        LIMIT 5
    `, [queryVector, classId, subject]);
    
    // 3. Filter by similarity threshold (70%)
    const relevantChunks = result.rows
        .filter(row => row.similarity > 0.7)
        .map(row => row.content);
    
    // 4. Combine chunks
    return relevantChunks.join('\n\n');
}
```

**What happens:**
- Generates embedding vector for student's question
- Searches `documents` table for similar content
- Filters by student's class_id and subject
- Returns top 5 most relevant chunks

---

### 🤖 **Step 6: LLM Generation (Backend)**

**Location:** `backend/src/ai/llm/gemini.provider.ts`

```typescript
async generate(messages: LLMMessage[]): Promise<string> {
    // Messages structure:
    // [
    //   { role: 'system', content: 'You are an educational AI...' },
    //   { role: 'system', content: 'RAG CONTEXT: Photosynthesis is...' },
    //   { role: 'user', content: 'Explain: What is photosynthesis?' }
    // ]
    
    const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey
            },
            body: JSON.stringify({ contents: messages })
        }
    );
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    // Returns: "Photosynthesis is the process by which plants..."
}
```

**What happens:**
- Sends request to Gemini API
- Includes system prompts, RAG context, and user question
- Receives generated response
- Returns raw text

---

### 📤 **Step 7: Response Parsing & Return (Backend)**

**Location:** `backend/src/ai/ai.service.ts`

```typescript
private parseResponse(text: string): AiResponseDto {
    // Parses markdown response into structured format
    return {
        title: "Photosynthesis Explained",
        explanation: "Photosynthesis is the process...",
        keyPoints: [
            "Plants use sunlight to convert CO2 and water into glucose",
            "Occurs in chloroplasts",
            "Produces oxygen as a byproduct"
        ],
        personalizedFeedback: "Based on your performance...",
        followUpQuestion: "Would you like to know more about chloroplasts?",
        rawResponse: text
    };
}
```

**Response sent to frontend:**
```json
{
  "title": "Photosynthesis Explained",
  "explanation": "Photosynthesis is the process...",
  "keyPoints": [...],
  "personalizedFeedback": "...",
  "followUpQuestion": "...",
  "rawResponse": "..."
}
```

---

### 📱 **Step 8: Frontend Receives Response**

**Location:** `src/components/AiTutor/AiTutorChat.tsx`

```typescript
const aiResponseEncoded = await aiService.processRequest(aiRequest);
// aiResponseEncoded = {
//   title: "Photosynthesis Explained",
//   explanation: "...",
//   keyPoints: [...],
//   ...
// }

// Add AI response to messages
setMessages((prev) => [
    ...prev,
    {
        sender: 'ai',
        content: aiResponseEncoded.explanation,
        timestamp: new Date()
    }
]);

// Optional: Text-to-speech
if (isVoiceModeOpen) {
    speakText(aiResponseEncoded.explanation);
}
```

**What happens:**
- Response received from backend
- Added to chat messages
- Displayed in UI
- Optional: Text-to-speech if voice mode is on

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: Student Types Question                          │
│    "What is photosynthesis?"                                 │
│    ↓                                                           │
│    AiTutorChat.handleSend()                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: aiService.processRequest()                      │
│    - Builds request object                                    │
│    - Gets student data (class_id, class_name)                 │
│    - Infers class band                                        │
│    ↓                                                           │
│    apiClient.post('/ai/doubt', {...})                         │
│    - Adds JWT token automatically                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND: HTTP Request Arrives                             │
│    POST http://localhost:3000/ai/doubt                       │
│    Headers: Authorization: Bearer <JWT_TOKEN>                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BACKEND: Authentication (JwtAuthGuard)                   │
│    - Validates JWT token                                      │
│    - Extracts user info (studentId, role, school_id)          │
│    ↓                                                           │
│    Authorization (RolesGuard)                                 │
│    - Checks if user has 'student' role                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND: AiController.doubt()                             │
│    - Receives request body                                    │
│    - Sets taskType = DOUBT                                    │
│    ↓                                                           │
│    Calls: aiService.processRequest(dto)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. BACKEND: AiService.processRequest()                       │
│    Step 0: Get student class_id from database                 │
│    Step 1: RAG retrieval (ragService.retrieve())             │
│    Step 2: Get mastery profile                               │
│    Step 3: Select prompt template                            │
│    Step 4: Call Gemini LLM                                    │
│    Step 5: Parse response                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. BACKEND: RAG Service                                       │
│    - Generate query embedding                                 │
│    - Search documents table (filter by class_id + subject)    │
│    - Return relevant chunks                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. BACKEND: Gemini LLM                                       │
│    - Receives: system prompt + RAG context + user question    │
│    - Generates response                                       │
│    - Returns raw text                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. BACKEND: Response Parsing                                 │
│    - Parses markdown into structured format                  │
│    - Returns AiResponseDto                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. FRONTEND: Receives Response                              │
│     - aiService returns parsed response                       │
│     - Adds to chat messages                                   │
│     - Displays in UI                                          │
│     - Optional: Text-to-speech                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Request/Response Examples

### Request (Frontend → Backend)

**HTTP Request:**
```
POST http://localhost:3000/ai/doubt
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Body:
{
  "taskType": "doubt",
  "query": "What is photosynthesis?",
  "studentId": "123e4567-e89b-12d3-a456-426614174000",
  "subject": "Biology",
  "classBand": "middle"
}
```

### Response (Backend → Frontend)

**HTTP Response:**
```
Status: 200 OK
Content-Type: application/json

Body:
{
  "title": "Photosynthesis Explained",
  "explanation": "Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce glucose and oxygen. This process occurs in the chloroplasts of plant cells...",
  "keyPoints": [
    "Plants use sunlight to convert CO2 and water into glucose",
    "Occurs in chloroplasts",
    "Produces oxygen as a byproduct",
    "Essential for life on Earth"
  ],
  "personalizedFeedback": "Based on your test scores, you're doing well in Biology! Keep up the good work.",
  "followUpQuestion": "Would you like to know more about how chloroplasts work?",
  "rawResponse": "### Title\nPhotosynthesis Explained\n\n### Explanation\n..."
}
```

---

## 🔑 Key Points

1. **Authentication:** JWT token is automatically added by `apiClient`
2. **Authorization:** Role-based access control (student, teacher, etc.)
3. **Class Filtering:** RAG only searches documents from student's class
4. **Subject Filtering:** Further filters by subject if provided
5. **Personalization:** Uses student's mastery profile for difficulty adjustment
6. **Error Handling:** Graceful degradation at each step
7. **Logging:** Comprehensive logging at every stage for debugging

---

## 🐛 Debugging Tips

**Check Console Logs:**
1. Frontend: Browser console → `[Frontend AI Service]` logs
2. Backend: Terminal → `[AI Controller]`, `[AI Service]`, `[RAG]` logs

**Common Issues:**
- **401 Unauthorized:** JWT token missing or expired
- **403 Forbidden:** User doesn't have required role
- **No RAG context:** No PDFs uploaded for student's class/subject
- **Slow response:** Check Gemini API latency, database query performance

---

## 📊 Performance Timeline

```
Frontend Request:        0ms
  ↓
Authentication:         +10ms
  ↓
Get Student Class:      +50ms
  ↓
RAG Retrieval:          +200ms
  ↓
Get Mastery:            +100ms
  ↓
LLM Generation:         +2000ms
  ↓
Parse Response:         +10ms
  ↓
Frontend Response:      +10ms
─────────────────────────────
Total:                  ~2380ms (2.4 seconds)
```

