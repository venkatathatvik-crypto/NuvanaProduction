# AI System Flow - Complete Explanation

## Why You're Getting "I don't currently have study material..." Response

This response appears because:
1. **No documents are uploaded** to the vector database yet
2. **RAG (Retrieval-Augmented Generation) finds nothing**
3. **System prompt instructs AI to refuse** when no content is available
4. **AI follows instructions** and politely declines

---

## Complete Request Flow (Step-by-Step)

### Step 1: Request Arrives at Controller
**File:** `backend/src/ai/ai.controller.ts`

```typescript
POST /ai/explain
{
  "query": "Explain photosynthesis",
  "subject": "Biology",
  "classBand": "middle",
  "studentId": "123..."
}
```

**What happens:**
- Controller receives request
- Sets `taskType = EXPLAIN`
- Passes to `AiService.processRequest()`

---

### Step 2: AI Service Orchestration
**File:** `backend/src/ai/ai.service.ts` (Lines 32-115)

#### 2.1 RAG Context Retrieval (Lines 37-48)
```typescript
// Try to get relevant content from uploaded documents
ragContext = await this.ragService.retrieve(query, subject, classBand);

// If nothing found:
if (!ragContext || ragContext.trim() === '') {
    ragContext = '[NO RELEVANT CONTENT FOUND]';  // ⚠️ THIS IS THE KEY!
}
```

**What happens:**
- Calls `RagService.retrieve()` to search vector database
- Searches for documents matching the query and subject
- **If no documents exist → returns empty string**
- Empty string gets converted to `[NO RELEVANT CONTENT FOUND]`

#### 2.2 Student Mastery Profile (Lines 50-65)
```typescript
if (studentId && subject) {
    const profile = await this.masteryService.getMasteryProfile(studentId, subject);
    // Gets real data from database: test scores, topic mastery, etc.
}
```

**What happens:**
- Queries `student_answers` table
- Calculates mastery scores per topic
- Determines difficulty level (Easy/Medium/Hard)
- **This part works!** (Uses real database data)

#### 2.3 Prompt Selection (Lines 67-100)
```typescript
switch (taskType) {
    case AiTaskType.EXPLAIN:
        userPrompt = ExplainPrompt(query, band, masteryProfile);
        break;
    // ... other task types
}
```

**What happens:**
- Selects appropriate prompt template based on task type
- Includes mastery profile for personalization
- Formats prompt for the LLM

#### 2.4 LLM Call (Lines 102-107)
```typescript
const rawContent = await this.llmProvider.generate([
    { role: 'system', content: SYSTEM_ROOT_PROMPT },      // ⚠️ Instructions
    { role: 'system', content: `RAG CONTEXT: ${ragContext}` },  // ⚠️ Empty context
    { role: 'user', content: userPrompt }
]);
```

**What happens:**
- Sends 3 messages to Gemini:
  1. **System prompt** - Instructions on how to behave
  2. **RAG context** - `[NO RELEVANT CONTENT FOUND]` (empty!)
  3. **User prompt** - The actual question

---

### Step 3: System Prompt Instructions
**File:** `backend/src/ai/prompts/system.prompt.ts` (Lines 27-31)

```typescript
🧩 STEP 1 — INGESTION & RAG READINESS CHECK
The RAG pipeline provides context. 
If RAG Context is provided as [NO RELEVANT CONTENT FOUND] or if the context implies no relevant material:
- Respond politely: "I don't currently have study material for this topic uploaded by your teacher. Please ask them to add it."
- Do NOT answer academically.
```

**This is why you see that message!**

The AI is **following instructions** from the system prompt. When it sees `[NO RELEVANT CONTENT FOUND]`, it's told to refuse politely.

---

### Step 4: RAG Service - How It Works
**File:** `backend/src/ai/rag/rag.service.ts` (Lines 93-143)

#### 4.1 Query Embedding (Line 100)
```typescript
const queryVector = await this.embeddingService.generateQueryEmbedding(query);
```

**What happens:**
- Converts your query ("Explain photosynthesis") into a vector
- Uses Gemini Embeddings API
- Creates 768-dimensional numerical representation

#### 4.2 Vector Search (Lines 113-120)
```typescript
const result = await this.pool.query(
    `SELECT content, 1 - (embedding <=> $1::vector) as similarity 
     FROM documents 
     WHERE metadata->>'subject' = $2
     ORDER BY similarity DESC 
     LIMIT 3`,
    [vectorStr, subject]
);
```

**What happens:**
- Searches `documents` table in PostgreSQL
- Compares query vector with stored document vectors
- Uses cosine similarity to find most relevant content
- **If table is empty → returns 0 rows → returns empty string**

#### 4.3 Current State
```
documents table: EMPTY ❌
  ↓
No documents found
  ↓
Returns empty string ""
  ↓
Converted to "[NO RELEVANT CONTENT FOUND]"
  ↓
AI sees this and refuses (following system prompt)
```

---

## How Documents Get Into the System

### Document Upload Flow (Not Yet Implemented)

For RAG to work, you need:

1. **Document Upload Endpoint** (Future feature)
   - Teachers upload PDFs, Word docs, text files
   - Files are processed and chunked

2. **Document Ingestion Service** (Future feature)
   - Splits documents into chunks (e.g., 500 words each)
   - Generates embeddings for each chunk
   - Stores in `documents` table with metadata:
     ```sql
     INSERT INTO documents (content, metadata, embedding) VALUES
     ('Photosynthesis is the process...', 
      '{"subject": "Biology", "classBand": "middle", "topic": "Photosynthesis"}',
      [0.123, 0.456, ...] -- 768 numbers
     );
     ```

3. **Vector Database Storage**
   - Each chunk gets stored with its embedding
   - Metadata includes subject, topic, classBand
   - Enables semantic search

---

## Current System Behavior

### What Works ✅

1. **Mastery Service** - Real database queries
   - Calculates student performance from test data
   - Provides personalization data

2. **Topics Service** - Real database queries
   - Calculates topic importance from questions
   - Provides recommendation data

3. **LLM Generation** - Gemini API working
   - Generates responses
   - Follows system instructions

4. **RAG Infrastructure** - Ready but empty
   - Database table exists
   - Embedding service works
   - Search logic works
   - **Just needs documents!**

### What's Missing ❌

1. **Document Upload Feature**
   - No endpoint to upload files
   - No file processing service
   - No document ingestion pipeline

2. **Documents in Database**
   - `documents` table is empty
   - No content to retrieve
   - RAG always returns empty

---

## Why This Design?

### Educational Safety First

The system is designed to:
- **Only use approved content** (teacher-uploaded materials)
- **Prevent hallucination** (no made-up facts)
- **Be syllabus-accurate** (only what's in uploaded files)

This is why the system prompt says:
```
🔐 ABSOLUTE BOUNDARIES
You must NEVER:
- Use internet knowledge
- Guess missing content
- Override ingestion checks
```

**This is intentional!** The AI refuses when it doesn't have approved content.

---

## How to Make It Work

### Option 1: Upload Documents (Recommended)

You need to implement:

1. **File Upload Endpoint**
   ```typescript
   POST /ai/documents/upload
   - Accept PDF, DOCX, TXT files
   - Process and chunk them
   - Generate embeddings
   - Store in vector database
   ```

2. **Document Processing**
   - Extract text from files
   - Split into chunks (500-1000 words)
   - Generate embeddings
   - Store with metadata

3. **Ingestion Service**
   - Already partially exists in codebase
   - Needs to be connected to upload endpoint

### Option 2: Temporary Workaround (For Testing)

If you want the AI to answer without documents (for testing):

**Modify System Prompt** (Not recommended for production):
```typescript
// In system.prompt.ts, change line 30:
// FROM:
- Do NOT answer academically.

// TO:
- You may provide general educational guidance, but clearly state it's not from uploaded materials.
```

**Or modify RAG check** (Not recommended):
```typescript
// In ai.service.ts, change line 46:
// FROM:
if (!ragContext || ragContext.trim() === '') {
    ragContext = '[NO RELEVANT CONTENT FOUND]';
}

// TO:
if (!ragContext || ragContext.trim() === '') {
    ragContext = '[GENERAL KNOWLEDGE MODE - No uploaded content available]';
}
```

**⚠️ Warning:** This defeats the purpose of syllabus-first design!

---

## Complete Flow Diagram

```
User Request
    ↓
Controller (ai.controller.ts)
    ↓
AiService.processRequest()
    ↓
    ├─→ RAG Service.retrieve()
    │       ├─→ EmbeddingService.generateQueryEmbedding()
    │       ├─→ Search documents table
    │       └─→ Returns: "" (empty - no documents!)
    │
    ├─→ MasteryService.getMasteryProfile()
    │       ├─→ Query student_answers table
    │       ├─→ Calculate mastery scores
    │       └─→ Returns: Real data ✅
    │
    ├─→ Select Prompt Template
    │       └─→ ExplainPrompt/SolvePrompt/etc.
    │
    └─→ GeminiProvider.generate()
            ├─→ System Prompt: "Refuse if no content"
            ├─→ RAG Context: "[NO RELEVANT CONTENT FOUND]"
            ├─→ User Prompt: "Explain photosynthesis"
            └─→ AI Response: "I don't have study material..."
```

---

## Summary

**Why you see that message:**
1. ✅ System is working correctly
2. ✅ RAG infrastructure is ready
3. ✅ AI is following safety instructions
4. ❌ No documents uploaded yet
5. ❌ Vector database is empty

**What needs to happen:**
1. Implement document upload feature
2. Process and store documents in vector database
3. RAG will then find relevant content
4. AI will answer using uploaded materials

**Current state:**
- System is **protecting students** from unverified content
- This is **by design** - not a bug!
- Once documents are uploaded, it will work automatically

---

## Next Steps

1. **For Testing:** Implement document upload endpoint
2. **For Production:** Add file processing and ingestion pipeline
3. **For Now:** System is working as designed - safely refusing without content

The AI system is **working correctly** - it's just being cautious and following the syllabus-first design principles!

