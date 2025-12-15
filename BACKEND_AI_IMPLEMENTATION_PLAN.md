# Backend AI Module - Dependencies & Implementation Plan

## 🎯 Goal
Fix backend errors and implement real-time data integration so the AI module can serve personalized, context-aware responses.

---

## 📦 External Dependencies Explained

### 1. **PostgreSQL Database (Primary Database)**
**What it is:**
- Your main application database storing all user data, tests, answers, etc.
- Already configured via Prisma ORM

**What it stores:**
- `student_answers` - Student test submissions with marks
- `questions` - Test questions with topics/chapters
- `test_submissions` - Test attempts by students
- `profiles` - User information
- `subjects_master` - Subject definitions
- `grade_subjects` - Subject-grade mappings

**Status:** ✅ Already exists and working

**What we need:**
- Access via `PrismaService` (already available)
- Query student performance data
- Calculate mastery scores

---

### 2. **PostgreSQL with pgvector Extension (Vector Database)**
**What it is:**
- Same PostgreSQL database but with `pgvector` extension enabled
- Stores document embeddings for semantic search (RAG)

**What it stores:**
- `documents` table with:
  - `content` - Text chunks from uploaded files
  - `embedding` - Vector representation (1536 dimensions)
  - `metadata` - JSON with subject, classBand, etc.

**Purpose:**
- Enables RAG (Retrieval-Augmented Generation)
- Allows AI to find relevant content from uploaded syllabus/notes
- Grounds AI responses in school-approved content only

**Status:** ⚠️ Partially configured
- Table creation code exists
- Extension creation may fail if pgvector not installed
- No actual documents stored yet

**Installation Required:**
```sql
-- Run in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

**What we need:**
- Verify pgvector is installed
- Add error handling for extension creation
- Document ingestion service (separate feature)

---

### 3. **Gemini API (LLM Provider)**
**What it is:**
- Google's AI model for generating responses
- Currently using `gemini-1.5-flash` model

**What it does:**
- Takes composed prompts (system + RAG context + user query)
- Generates educational responses
- Follows system instructions for syllabus-first behavior

**Status:** ✅ Configured but needs validation
- API key required: `GEMINI_API_KEY`
- Model initialized in `GeminiProvider`
- No startup validation (fails at runtime)

**What we need:**
- Startup validation for API key
- Better error handling
- Rate limiting consideration

---

### 4. **Gemini Embeddings API (For RAG)**
**What it is:**
- Part of Gemini API suite
- Converts text to numerical vectors (embeddings)
- Enables semantic search in vector database

**What it does:**
- Takes query text → returns 1536-dimensional vector
- Takes document text → returns vector for storage
- Vectors enable similarity search (find related content)

**Status:** ❌ NOT IMPLEMENTED
- `EmbeddingService` is completely disabled
- Returns empty arrays
- RAG cannot work without this

**What we need:**
- Implement using Gemini's `embedContent` API
- Or use alternative embedding service
- Enable in `EmbeddingService`

**API Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent
```

---

## 🔧 Implementation Plan

### Phase 1: Fix Critical Backend Errors (Priority 1)

#### 1.1 Fix Port Configuration
**File:** `backend/src/main.ts`
**Issue:** Backend runs on port 3000, frontend expects 4000
**Fix Options:**
- Option A: Change backend to port 4000
- Option B: Update frontend default to 3000
- Option C: Document requirement for `VITE_BACKEND_URL`

**Recommended:** Option A (change backend to 4000 for consistency)

---

#### 1.2 Implement Mastery Service (Real Database Queries)
**File:** `backend/src/ai/recommender/mastery.service.ts`
**Current:** Returns mock data
**Needed:** Calculate from `student_answers` table

**Implementation Steps:**

1. **Inject PrismaService**
```typescript
constructor(private prisma: PrismaService) {}
```

2. **Query Student Performance Data**
```typescript
async getMasteryProfile(studentId: string, subject: string) {
  // Get all test submissions for this student
  const submissions = await this.prisma.test_submissions.findMany({
    where: {
      student_id: studentId,
      is_graded: true,
      tests: {
        grade_subjects: {
          subjects_master: {
            name: subject
          }
        }
      }
    },
    include: {
      student_answers: {
        include: {
          questions: {
            select: {
              topic: true,
              chapter: true,
              marks: true,
              correct_option_index: true
            }
          }
        }
      }
    }
  });
  
  // Calculate mastery per topic
  const topicScores: Record<string, { correct: number; total: number }> = {};
  let totalMarks = 0;
  let obtainedMarks = 0;
  
  submissions.forEach(submission => {
    submission.student_answers.forEach(answer => {
      const topic = answer.questions.topic || 'General';
      const questionMarks = answer.questions.marks;
      const marksAwarded = answer.marks_awarded || 0;
      
      if (!topicScores[topic]) {
        topicScores[topic] = { correct: 0, total: 0 };
      }
      
      topicScores[topic].total += questionMarks;
      totalMarks += questionMarks;
      
      if (marksAwarded > 0) {
        topicScores[topic].correct += marksAwarded;
        obtainedMarks += marksAwarded;
      }
    });
  });
  
  // Convert to mastery scores (0-1 scale)
  const topics: Record<string, number> = {};
  Object.entries(topicScores).forEach(([topic, scores]) => {
    topics[topic] = scores.total > 0 ? scores.correct / scores.total : 0;
  });
  
  const overallScore = totalMarks > 0 ? obtainedMarks / totalMarks : 0.5;
  
  return {
    studentId,
    subject,
    topics,
    overallScore,
    totalQuestions: submissions.reduce((sum, s) => sum + s.student_answers.length, 0)
  };
}
```

3. **Handle Missing Data Gracefully**
```typescript
if (submissions.length === 0) {
  return {
    studentId,
    subject,
    topics: {},
    overallScore: 0.5, // Neutral
    totalQuestions: 0
  };
}
```

**Dependencies:**
- ✅ PrismaService (already available)
- ✅ Database schema (already exists)
- ✅ Test data (needs to exist in database)

---

#### 1.3 Implement Topics Service (Database-Driven)
**File:** `backend/src/ai/recommender/topics.service.ts`
**Current:** Hardcoded Mathematics topics
**Needed:** Dynamic from database or configuration

**Implementation Options:**

**Option A: Calculate from Test Questions (Recommended)**
```typescript
async getTopicsImportance(subject: string, schoolId?: string): Promise<Record<string, number>> {
  // Get all questions for this subject
  const questions = await this.prisma.questions.findMany({
    where: {
      tests: {
        grade_subjects: {
          subjects_master: {
            name: subject,
            school_id: schoolId
          }
        }
      }
    },
    select: {
      topic: true,
      marks: true
    }
  });
  
  // Calculate importance based on frequency and marks weight
  const topicWeights: Record<string, number> = {};
  let totalMarks = 0;
  
  questions.forEach(q => {
    const topic = q.topic || 'General';
    if (!topicWeights[topic]) {
      topicWeights[topic] = 0;
    }
    topicWeights[topic] += q.marks;
    totalMarks += q.marks;
  });
  
  // Normalize to 0-1 scale
  const importance: Record<string, number> = {};
  Object.entries(topicWeights).forEach(([topic, weight]) => {
    importance[topic] = totalMarks > 0 ? weight / totalMarks : 0.1;
  });
  
  return importance;
}
```

**Option B: Store in Database Table**
- Create `topic_importance` table
- Allow teachers/admins to set importance
- Fallback to Option A if not set

**Dependencies:**
- ✅ PrismaService
- ✅ Questions with topics populated

---

#### 1.4 Enable Embedding Service (Critical for RAG)
**File:** `backend/src/ai/rag/embedding.service.ts`
**Current:** Disabled, returns empty arrays
**Needed:** Call Gemini Embeddings API

**Implementation:**

1. **Install Google Generative AI SDK** (if not already)
```bash
npm install @google/generative-ai
```

2. **Implement Embedding Generation**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(EmbeddingService.name);
  
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Embeddings disabled.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) {
      this.logger.warn('Embedding service not initialized');
      return [];
    }
    
    try {
      // Use embedding-001 model (or text-embedding-004 if available)
      const model = this.genAI.getGenerativeModel({ 
        model: 'embedding-001' 
      });
      
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      
      if (!embedding || embedding.length === 0) {
        this.logger.warn('Empty embedding returned');
        return [];
      }
      
      return embedding;
    } catch (error) {
      this.logger.error('Embedding generation failed:', error);
      return []; // Graceful degradation
    }
  }
}
```

**Note:** Check Gemini API documentation for correct embedding model name and API format.

**Dependencies:**
- ✅ GEMINI_API_KEY (same as LLM)
- ⚠️ Verify embedding model availability
- ✅ Google Generative AI SDK

---

#### 1.5 Fix RAG Service Database Connection
**File:** `backend/src/ai/rag/rag.service.ts`
**Issues:**
- No actual connection test
- Extension creation may fail silently
- No error handling

**Fixes:**

1. **Add Connection Validation**
```typescript
async onModuleInit() {
  if (!this.isConnected) {
    this.logger.warn('RAG: Database not connected. RAG disabled.');
    return;
  }
  
  try {
    // Test connection
    await this.pool.query('SELECT 1');
    
    // Check if pgvector extension exists
    const extResult = await this.pool.query(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`
    );
    
    if (!extResult.rows[0].exists) {
      this.logger.warn('pgvector extension not found. Attempting to create...');
      await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    }
    
    // Create documents table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(768) -- Adjust based on embedding model
      );
      
      CREATE INDEX IF NOT EXISTS documents_embedding_idx 
      ON documents USING ivfflat (embedding vector_cosine_ops);
      
      CREATE INDEX IF NOT EXISTS documents_subject_idx 
      ON documents ((metadata->>'subject'));
    `);
    
    this.logger.log('✓ RAG service initialized successfully');
  } catch (error) {
    this.logger.error('RAG initialization failed:', error);
    this.isConnected = false; // Disable RAG on failure
  }
}
```

2. **Fix Embedding Dimension**
- Check actual embedding dimension from EmbeddingService
- Update table schema to match (768, 1536, etc.)

**Dependencies:**
- ✅ PostgreSQL with pgvector extension
- ✅ DATABASE_URL environment variable
- ⚠️ Extension installation on database server

---

#### 1.6 Add PrismaService to AI Module
**File:** `backend/src/ai/ai.module.ts`
**Issue:** MasteryService and TopicsService need database access

**Fix:**
```typescript
@Module({
  imports: [
    ConfigModule,
    RagModule,
    PrismaModule, // 👈 ADD THIS
  ],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiProvider,
    MasteryService,
    RecommendationService,
    TopicsService,
  ],
})
export class AiModule { }
```

**Dependencies:**
- ✅ PrismaModule (already exists)

---

### Phase 2: Improve Error Handling & Validation

#### 2.1 Add Startup Validation for Gemini API Key
**File:** `backend/src/ai/llm/gemini.provider.ts`

**Fix:**
```typescript
onModuleInit() {
  const apiKey = this.configService.get<string>('GEMINI_API_KEY');
  if (!apiKey || apiKey.trim() === '') {
    this.logger.error('❌ GEMINI_API_KEY is missing. AI features will not work.');
    throw new Error('GEMINI_API_KEY is required');
  }
  
  if (this.model) {
    this.logger.log('✓ GeminiProvider ready');
  } else {
    this.logger.error('❌ GeminiProvider failed to initialize');
    throw new Error('Gemini model initialization failed');
  }
}
```

---

#### 2.2 Improve Response Parsing with Fallbacks
**File:** `backend/src/ai/ai.service.ts`

**Current:** Regex-based parsing (fragile)
**Improvement:** Add validation and fallbacks

```typescript
private parseResponse(text: string): AiResponseDto {
  const response = new AiResponseDto();
  response.rawResponse = text;
  
  // Try to extract structured sections
  response.title = this.extractSection(text, 'Title') || 
                   this.extractSection(text, '###') || 
                   'AI Response';
  
  response.explanation = this.extractSection(text, 'Explanation') || 
                        this.extractSection(text, '### Explanation') ||
                        text; // Fallback to full text
  
  response.personalizedFeedback = this.extractSection(text, 'Personalized Feedback') ||
                                  this.extractSection(text, 'Feedback');
  
  response.followUpQuestion = this.extractSection(text, 'Follow-up Question') ||
                              this.extractSection(text, 'Follow up');
  
  // Extract key points
  const keyPointsRaw = this.extractSection(text, 'Key Points');
  if (keyPointsRaw) {
    response.keyPoints = keyPointsRaw
      .split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()))
      .map(l => l.replace(/^[-*\d+\.]\s*/, '').trim())
      .filter(l => l.length > 0);
  }
  
  // Validate minimum required fields
  if (!response.explanation || response.explanation.trim().length < 10) {
    response.explanation = text; // Use raw response if parsing failed
  }
  
  return response;
}
```

---

### Phase 3: Configuration & Environment

#### 3.1 Environment Variables Required
**File:** `.env` (backend)

```env
# Required
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/nuvana_db

# Optional (with defaults)
PORT=4000
```

**Validation:** Add startup check in `main.ts`

---

## 📊 Data Flow for Real-Time Mastery

### Current Flow (Mock):
```
Request → MasteryService → Returns { overallScore: 0.5, topics: {} }
```

### Target Flow (Real Data):
```
Request → MasteryService → PrismaService → Database Query
  ↓
Query student_answers JOIN questions WHERE student_id = X AND subject = Y
  ↓
Calculate:
  - Total marks per topic
  - Obtained marks per topic
  - Mastery = obtained / total (per topic)
  - Overall = sum(obtained) / sum(total)
  ↓
Return {
  overallScore: 0.75,
  topics: {
    "Algebra": 0.8,
    "Geometry": 0.6,
    "Calculus": 0.9
  }
}
```

---

## 🚨 Critical Dependencies Checklist

### Must Have (Blocks Functionality):
- [ ] **GEMINI_API_KEY** - Required for AI responses
- [ ] **DATABASE_URL** - Required for mastery calculation
- [ ] **PrismaService** - Required for database access
- [ ] **Student test data** - Required for personalization (must exist in DB)

### Should Have (Enables RAG):
- [ ] **pgvector extension** - Required for vector search
- [ ] **EmbeddingService** - Required for RAG
- [ ] **Documents in vector DB** - Required for context retrieval

### Nice to Have (Improves Quality):
- [ ] **Topics importance data** - Improves recommendations
- [ ] **Class band from profile** - Improves language adaptation
- [ ] **Subject context** - Improves RAG accuracy

---

## 🔄 Implementation Order

### Step 1: Quick Wins (30 minutes)
1. Fix port configuration
2. Add PrismaModule to AiModule
3. Add startup validation for API key

### Step 2: Core Functionality (2-3 hours)
4. Implement MasteryService with real queries
5. Implement TopicsService with real queries
6. Test with actual student data

### Step 3: RAG Enablement (2-3 hours)
7. Implement EmbeddingService
8. Fix RAG service connection validation
9. Test embedding generation

### Step 4: Polish (1 hour)
10. Improve error handling
11. Add response parsing fallbacks
12. Add logging

---

## 🧪 Testing Requirements

### Test Cases Needed:

1. **Mastery Service:**
   - Student with no test data → Returns neutral (0.5)
   - Student with test data → Returns calculated scores
   - Student with multiple subjects → Returns subject-specific scores

2. **RAG Service:**
   - No embeddings → Returns empty string (graceful)
   - No documents → Returns empty string
   - Documents exist → Returns relevant chunks

3. **AI Service:**
   - Valid request → Returns structured response
   - Missing API key → Returns clear error
   - Invalid request → Returns validation error

---

## 📝 Notes

### Database Schema Assumptions:
- `student_answers.marks_awarded` - Marks given to student
- `questions.marks` - Total marks for question
- `questions.topic` - Topic name (nullable)
- `questions.chapter` - Chapter name (nullable)
- `test_submissions.is_graded` - Whether submission is graded

### Performance Considerations:
- Mastery calculation may be slow for students with many tests
- Consider caching mastery scores
- Consider background job to pre-calculate mastery

### Future Enhancements:
- Cache mastery profiles (Redis)
- Background job for mastery calculation
- Incremental updates instead of full recalculation
- Topic importance from teacher/admin configuration

---

## ✅ Success Criteria

Backend is "fixed" when:
1. ✅ MasteryService returns real data from database
2. ✅ TopicsService returns dynamic topic importance
3. ✅ EmbeddingService generates actual embeddings (or gracefully degrades)
4. ✅ RAG service connects to database properly
5. ✅ All services handle missing data gracefully
6. ✅ No mock data returned to frontend
7. ✅ Clear error messages for configuration issues

---

## 🎯 Next Steps

1. Review this plan
2. Start with Step 1 (Quick Wins)
3. Test each phase before moving to next
4. Update documentation as you implement

