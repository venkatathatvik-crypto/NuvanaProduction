# AI RAG System - Test Prompts

## Setup Instructions

1. **Upload a PDF file** (as a teacher):
   - Go to Teacher Portal → Files
   - Upload a PDF (e.g., Biology textbook chapter)
   - Select: Class (e.g., "Class 8"), Subject (e.g., "Biology")
   - Wait for processing (check backend logs)

2. **Test as a Student**:
   - Login as a student in the same class
   - Go to AI Tutor Chat
   - Ask questions related to the uploaded PDF content

---

## Test Scenarios

### Scenario 1: Basic Question (After PDF Upload)

**Expected Flow:**
1. Teacher uploads "Biology Chapter 1 - Cells.pdf" for Class 8
2. PDF is processed → chunks stored in vector DB
3. Student (Class 8) asks: "What is a cell?"

**Test Prompts:**
```
"What is a cell?"
"Explain the structure of a plant cell"
"What are the differences between plant and animal cells?"
"Tell me about mitochondria"
```

**Expected Result:**
- ✅ AI should answer using content from the uploaded PDF
- ✅ Response should be accurate and syllabus-based
- ✅ Console logs should show RAG retrieval with chunks found

---

### Scenario 2: Subject-Specific Questions

**Test Prompts (Biology):**
```
"What is photosynthesis?"
"Explain the process of respiration"
"What are the main parts of a flower?"
```

**Test Prompts (Mathematics):**
```
"Explain quadratic equations"
"What is the Pythagorean theorem?"
"How do I solve linear equations?"
```

**Test Prompts (Physics):**
```
"What is Newton's first law?"
"Explain the concept of force"
"What is acceleration?"
```

**Expected Result:**
- ✅ AI should only use content from PDFs in the specified subject
- ✅ If no PDF for that subject, should politely refuse

---

### Scenario 3: Class-Specific Filtering

**Setup:**
- Teacher uploads "Math Book.pdf" for Class 8
- Teacher uploads "Math Book.pdf" for Class 9

**Test:**
- Student in Class 8 asks: "Explain algebra"
- Student in Class 9 asks: "Explain algebra"

**Expected Result:**
- ✅ Class 8 student gets answers from Class 8 PDF only
- ✅ Class 9 student gets answers from Class 9 PDF only
- ✅ No cross-contamination between classes

---

### Scenario 4: No Content Found

**Test Prompts:**
```
"Explain quantum physics" (if no Physics PDF uploaded)
"What is calculus?" (if no Math PDF uploaded for that class)
"Tell me about Shakespeare" (if no English PDF uploaded)
```

**Expected Result:**
- ✅ AI should respond: "I don't currently have study material for this topic uploaded by your teacher. Please ask them to add it."
- ✅ Should NOT hallucinate or make up answers
- ✅ Console logs should show: `[RAG] No documents found`

---

### Scenario 5: Different Task Types

**Explain:**
```
"Explain the water cycle"
"What is DNA?"
```

**Solve:**
```
"Solve: 2x + 5 = 15"
"Calculate the area of a circle with radius 5"
```

**Doubt:**
```
"I don't understand why plants need sunlight"
"Can you help me understand photosynthesis better?"
```

**Summary:**
```
"Summarize the chapter on cells"
"Give me a summary of quadratic equations"
```

**Expected Result:**
- ✅ Each task type should use appropriate prompt template
- ✅ Responses should match the task type

---

### Scenario 6: Student Mastery Integration

**Setup:**
- Student has taken tests in Biology
- Student scored low on "Cells" topic, high on "Plants" topic

**Test Prompts:**
```
"Explain cells" (should adapt to low mastery - simpler explanation)
"Tell me about plants" (should adapt to high mastery - more advanced)
```

**Expected Result:**
- ✅ AI should adjust difficulty based on mastery
- ✅ Console logs should show mastery profile

---

### Scenario 7: Multiple PDFs Same Subject

**Setup:**
- Teacher uploads "Biology Chapter 1.pdf"
- Teacher uploads "Biology Chapter 2.pdf"
- Both for Class 8, Subject: Biology

**Test:**
```
"Explain photosynthesis" (could be in either PDF)
```

**Expected Result:**
- ✅ AI should search across all PDFs for that class/subject
- ✅ Should return most relevant chunks from any PDF

---

## Console Log Checklist

When testing, check backend console for these logs:

### PDF Upload:
```
[File Upload] 📄 PDF detected, scheduling RAG processing...
[PDF Processing] Starting processing for file_id: ...
[PDF Processing] Step 1: Extracting text from PDF...
[PDF Processing] ✓ Extracted X characters from PDF
[PDF Processing] Step 2: Chunking text...
[PDF Processing] ✓ Created X chunks
[PDF Processing] Step 3: Generating embeddings and storing chunks...
[PDF Processing] ✓ Generated embedding (768 dimensions) for chunk 1
[PDF Processing] ✓ Stored chunk 1/X in vector database
[PDF Processing] ✅ Processing complete!
```

### AI Request:
```
[AI Controller] POST /ai/doubt - Request received
[AI Service] ========================================
[AI Service] 🚀 New AI Request Received
[AI Service] Step 0: Getting student's class information...
[AI Service] ✓ Student class_id: ...
[AI Service] Step 1: Retrieving RAG context...
[RAG] Starting retrieval - Query: "...", Subject: "...", ClassID: "..."
[RAG] Step 1: Generating query embedding...
[RAG] ✓ Generated query embedding (768 dimensions)
[RAG] Step 2: Searching vector database...
[RAG] Filtering by class_id: ... AND subject: ...
[RAG] Found X potential matches
[RAG] Chunk similarity: 85.2%
[RAG] ✅ Retrieved X relevant document chunks
[AI Service] ✓ RAG context available (X chars)
[AI Service] Step 2: Getting student mastery profile...
[AI Service] Step 3: Selecting prompt template...
[AI Service] Step 4: Calling Gemini LLM...
[AI Service] ✓ LLM response received (Xms, X chars)
[AI Service] Step 5: Parsing LLM response...
[AI Service] ✅ Request completed in Xms
```

---

## Performance Benchmarks

**Expected Timings:**
- PDF Processing: 5-30 seconds (depending on PDF size)
- RAG Retrieval: 200-500ms
- LLM Generation: 1-3 seconds
- Total AI Request: 2-5 seconds

**If slower:**
- Check embedding service (Gemini API)
- Check database connection
- Check vector index performance

---

## Troubleshooting

### Issue: "No study material found" even after upload

**Check:**
1. Backend logs for PDF processing errors
2. Database: `SELECT COUNT(*) FROM documents;` (should be > 0)
3. Metadata: `SELECT metadata FROM documents LIMIT 1;` (check class_id, subject)
4. Student's class_id matches file's class_id

### Issue: Wrong class content shown

**Check:**
1. Student's class_id in `student_details` table
2. File's class_id in `files` table
3. Document metadata class_id matches

### Issue: PDF processing fails

**Check:**
1. PDF file is valid (not corrupted)
2. Gemini API key is set
3. Database connection (pgvector extension)
4. File size (max 10MB)

---

## Quick Test Commands

### Check Documents in Database:
```sql
SELECT 
    id,
    LENGTH(content) as content_length,
    metadata->>'class_id' as class_id,
    metadata->>'subject' as subject,
    metadata->>'file_id' as file_id
FROM documents
ORDER BY id DESC
LIMIT 10;
```

### Check Files Table:
```sql
SELECT 
    id,
    file_title,
    class_id,
    file_type,
    created_at
FROM files
WHERE file_type = 'pdf'
ORDER BY created_at DESC;
```

### Check Student Class:
```sql
SELECT 
    p.id as student_id,
    sd.class_id,
    c.name as class_name
FROM profiles p
JOIN student_details sd ON p.id = sd.profile_id
LEFT JOIN classes c ON sd.class_id = c.id
WHERE p.id = 'STUDENT_ID_HERE';
```

---

## Success Criteria

✅ PDF upload triggers processing  
✅ Processing completes without errors  
✅ Documents stored with correct metadata  
✅ Student questions retrieve relevant chunks  
✅ AI answers use uploaded content  
✅ Wrong class content is NOT shown  
✅ No content = polite refusal (no hallucination)  
✅ Performance is acceptable (< 5s total)  

---

## Next Steps After Testing

1. **If all tests pass:** System is ready for production
2. **If issues found:** Check logs, fix bugs, retest
3. **Performance issues:** Optimize chunking, indexing, or caching
4. **Content quality:** Adjust chunk size, similarity threshold, or prompts

