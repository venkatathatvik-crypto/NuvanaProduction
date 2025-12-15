# RAG File Integration - Complete Understanding

## Current System Architecture

### 1. File Upload Flow (Teacher Side)

**Frontend:** `src/pages/teacher/Files.tsx`
- Teacher selects: Class, Subject, Category, File (PDF/Video)
- Calls: `uploadTeacherFile()` service
- Endpoint: `POST /file-upload/files`

**Backend:** `backend/src/file-upload/file-upload.service.ts`
- Validates file (PDF max 10MB, Video max 100MB)
- Uploads to **Supabase Storage** (bucket: `FILES_BUCKET`)
- Saves metadata to **`files` table**:
  ```sql
  files {
    id: UUID
    file_title: "Biology Textbook Chapter 1"
    class_id: UUID (e.g., Class 8B)
    grade_subject_id: UUID (links to subject)
    storage_url: "teacherId/timestamp-filename.pdf" (Supabase path)
    file_type: "pdf" | "video"
    school_id: UUID
    teacher_id: UUID
  }
  ```

**Storage:**
- Files stored in **Supabase Storage** (not in database)
- Database only stores metadata + storage path
- Public URL generated: `https://supabase.co/storage/v1/object/public/FILES_BUCKET/path`

---

### 2. File Access Flow (Student Side)

**Frontend:** `src/pages/student/Books.tsx`
- Student views files assigned to their class
- Calls: `getStudentFiles(classId, schoolId)`
- Endpoint: `GET /file-upload/files/class/:classId`

**Backend:** `backend/src/file-upload/file-upload.service.ts` (getFilesByClass)
- Queries `files` table where `class_id = student's class_id`
- Returns list of files with public URLs
- Student can download/view PDFs and videos

**Student Class Resolution:**
- Student's class is in `student_details.class_id`
- Example: Student in "Class 8B" → `class_id` points to that class
- Files uploaded for "Class 8" → same `class_id` if 8B is part of Class 8

---

### 3. Current RAG System

**Current State:**
- `documents` table exists (for vector storage)
- `RagService` can search vectors
- `EmbeddingService` can generate embeddings
- **BUT:** No connection between uploaded files and vector database!

**Missing Link:**
- When teacher uploads PDF → **NOT processed for RAG**
- PDFs sit in Supabase Storage
- `documents` table is empty
- RAG always returns empty

---

## Required Workflow

### Step 1: Teacher Uploads PDF
```
Teacher → Upload PDF → Supabase Storage ✅
         ↓
         Save to files table ✅
         ↓
         [NEW] Process PDF for RAG ❌
         ↓
         Extract text from PDF
         ↓
         Chunk text (500-1000 words each)
         ↓
         Generate embeddings for each chunk
         ↓
         Store in documents table with metadata:
           - class_id (from file)
           - subject (from grade_subject)
           - file_id (link to original file)
```

### Step 2: Student Asks Question
```
Student asks: "Explain photosynthesis"
         ↓
AI Service → RAG Service.retrieve()
         ↓
         Get student's class_id from student_details
         ↓
         [NEW] Query documents table:
           WHERE class_id = student.class_id
           AND subject = query.subject
           AND similarity > 0.7
         ↓
         Returns relevant chunks from uploaded PDFs
         ↓
         AI generates answer using those chunks
```

---

## Database Schema Understanding

### `files` Table (Current)
```sql
files {
  id: UUID
  file_title: "Biology Book"
  class_id: UUID → links to classes table
  grade_subject_id: UUID → links to grade_subjects → subjects_master
  storage_url: "path/to/file.pdf" (Supabase path)
  file_type: "pdf" | "video"
  school_id: UUID
  teacher_id: UUID
}
```

### `documents` Table (RAG - Current)
```sql
documents {
  id: SERIAL
  content: TEXT (chunk of text from PDF)
  metadata: JSONB {
    "subject": "Biology",
    "class_id": "uuid",
    "file_id": "uuid",  // [NEW] Link to files table
    "chunk_index": 0,
    "classBand": "middle"
  }
  embedding: vector(768) (Gemini embedding)
}
```

### `student_details` Table
```sql
student_details {
  profile_id: UUID
  class_id: UUID → links to classes table
  roll_number: string
}
```

### Relationship Chain
```
Student → student_details.class_id → classes.id
                                    ↓
Files → files.class_id → classes.id (same class!)
                                    ↓
Documents → documents.metadata->>'class_id' → classes.id (same class!)
```

---

## Implementation Plan

### Phase 1: PDF Processing on Upload

**When:** Teacher uploads PDF file

**What to do:**
1. **Extract text from PDF**
   - Use `pdf-parse` library (already in dependencies)
   - Extract all text content

2. **Chunk the text**
   - Split into chunks of 500-1000 words
   - Preserve context (don't split mid-sentence)
   - Each chunk becomes a `documents` row

3. **Generate embeddings**
   - For each chunk, call `EmbeddingService.generateEmbedding()`
   - Get 768-dimensional vector

4. **Store in documents table**
   - Insert each chunk with:
     - `content`: chunk text
     - `metadata`: `{ subject, class_id, file_id, chunk_index, classBand }`
     - `embedding`: vector

**Where to implement:**
- Modify `FileUploadService.uploadFile()` method
- After saving to `files` table, process PDF if `file_type === 'pdf'`

---

### Phase 2: RAG Search by Student Class

**When:** Student asks question via AI

**What to do:**
1. **Get student's class**
   - Query `student_details` where `profile_id = studentId`
   - Get `class_id`

2. **Get subject from query**
   - From request: `subject` field
   - Or infer from `grade_subject_id` if available

3. **Search documents**
   - Query `documents` table:
     ```sql
     WHERE metadata->>'class_id' = student.class_id
     AND metadata->>'subject' = query.subject
     AND similarity > 0.7
     ```

4. **Return relevant chunks**
   - RAG service returns chunks from student's class PDFs only

**Where to modify:**
- `RagService.retrieve()` - add class_id filtering
- `AiService.processRequest()` - get student class and pass to RAG

---

### Phase 3: Class Matching Logic

**Important:** Class name matching
- Student in "Class 8B" → `class_id` points to that specific class
- Teacher uploads for "Class 8" → might be different `class_id`
- **Solution:** Use `class_id` directly (exact match)
- OR: Use `grade_level_id` to match all classes in same grade

**Current understanding:**
- `classes` table has `grade_level_id`
- Multiple classes can have same `grade_level_id` (8A, 8B, 8C all grade 8)
- Files are uploaded to specific `class_id`
- **Decision needed:** Should RAG search:
  - Option A: Only exact `class_id` match (strict)
  - Option B: All classes with same `grade_level_id` (broader)

---

## Key Questions to Answer

1. **Class Matching:**
   - If teacher uploads for "Class 8" and student is in "Class 8B", should student see it?
   - **Recommendation:** Use exact `class_id` match for now (can expand later)

2. **Subject Matching:**
   - How to match subject name? (case-sensitive? exact match?)
   - **Current:** Uses `subjects_master.name` from `grade_subjects`
   - **Recommendation:** Case-insensitive matching

3. **PDF Processing:**
   - Process on upload (synchronous) or background job (asynchronous)?
   - **Recommendation:** Background job for large files, sync for small ones

4. **Chunk Size:**
   - How big should chunks be? (500 words? 1000 words?)
   - **Recommendation:** 500-800 words with overlap

5. **File Updates:**
   - What if teacher re-uploads same file? Delete old chunks?
   - **Recommendation:** Delete old chunks when file is updated/deleted

---

## Implementation Steps

### Step 1: Create PDF Processing Service
- Extract text from PDF
- Chunk text
- Generate embeddings
- Store in documents table

### Step 2: Integrate with File Upload
- After file upload, trigger PDF processing
- Handle errors gracefully (don't fail upload if processing fails)

### Step 3: Modify RAG Service
- Add class_id parameter
- Filter documents by class_id and subject
- Return chunks from student's class PDFs

### Step 4: Modify AI Service
- Get student's class_id
- Pass to RAG service
- Handle case when no files for class

### Step 5: Update Frontend
- Pass class_id and subject when available
- Better error messages

---

## Expected Flow After Implementation

```
1. Teacher uploads "Biology Book.pdf" for Class 8
   ↓
2. File saved to Supabase + files table
   ↓
3. PDF Processing Service:
   - Extracts text: "Photosynthesis is..."
   - Chunks: [chunk1, chunk2, chunk3...]
   - Embeddings: [vector1, vector2, vector3...]
   - Stores in documents table with:
     metadata: {
       class_id: "class-8-uuid",
       subject: "Biology",
       file_id: "file-uuid",
       chunk_index: 0
     }
   ↓
4. Student (Class 8B) asks: "Explain photosynthesis"
   ↓
5. AI Service:
   - Gets student class_id: "class-8-uuid" (same as file!)
   - Calls RAG with class_id + subject
   ↓
6. RAG Service:
   - Searches documents WHERE class_id = "class-8-uuid" AND subject = "Biology"
   - Finds relevant chunks
   - Returns: "Photosynthesis is the process..."
   ↓
7. AI generates answer using chunks
   ↓
8. Student gets accurate, syllabus-based answer! ✅
```

---

## What I Understand

✅ **Files are uploaded** → Supabase Storage + `files` table  
✅ **Students access files** → By `class_id`  
✅ **RAG infrastructure exists** → `documents` table, embeddings, search  
❌ **Missing:** PDF → Text → Chunks → Embeddings → Documents pipeline  
❌ **Missing:** RAG filtering by student's class_id  
❌ **Missing:** Connection between `files` and `documents` tables  

**Next:** I'll implement the missing pieces!

