# Gemini API Setup Guide

## ✅ Step 1: Add API Key to Environment Variables

Add your Gemini API key to the backend `.env` file:

**Location:** `backend/.env` (create if it doesn't exist)

```env
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyDw8YbKIZR-EW4pGoqm6JDMC8qNMWEgA_I

# Optional: Specify model name (default: gemini-2.5-flash)
# Based on official docs: https://ai.google.dev/gemini-api/docs/quickstart#javascript
# Options: gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-pro, gemini-pro
# GEMINI_MODEL=gemini-2.5-flash

# Database (if not already set)
DATABASE_URL=postgresql://username:password@localhost:5432/nuvana_db
```

**⚠️ IMPORTANT:**
- Never commit `.env` file to git (it should be in `.gitignore`)
- Keep your API key secure
- The key above is your actual key - make sure it's in `.env` only

---

## ✅ Step 2: Install pgvector Extension (For RAG)

If you want RAG (Retrieval-Augmented Generation) to work, you need to install the `pgvector` extension in your PostgreSQL database.

### Option A: Using psql (Command Line)

```bash
# Connect to your database
psql -U your_username -d nuvana_db

# Run this command:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Option B: Using pgAdmin or Database GUI

1. Connect to your database
2. Open Query Tool
3. Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### Option C: Automatic (Already Handled)

The RAG service will attempt to create the extension automatically on startup. However, if it fails, you'll need to install it manually as shown above.

**Note:** If pgvector is not installed, RAG will be disabled but the rest of the AI features will still work.

---

## ✅ Step 3: Verify Setup

### Check Backend Logs

When you start the backend, you should see:

```
✓ GeminiProvider ready for requests
   Model: gemini-1.5-flash
✓ EmbeddingService enabled with Gemini API
✓ RAG service initialized successfully
```

If you see errors:
- `❌ GEMINI_API_KEY is missing` → Add key to `.env` file
- `Failed to create pgvector extension` → Install pgvector manually (RAG will be disabled but AI still works)

---

## ✅ Step 4: Test the Implementation

### Test Mastery Service

The MasteryService now queries real data from your database:
- Only includes graded tests (`is_graded = true`)
- Calculates mastery per topic
- Includes both recent and historical data

### Test Topics Service

The TopicsService calculates importance from all questions in your database:
- Based on marks weight (more marks = more important)
- Normalized to 0-1 scale

### Test Embedding Service

Embeddings are now enabled:
- Generates 768-dimensional vectors
- Uses Gemini's `text-embedding-004` model
- Gracefully degrades if API key is missing

---

## 🔧 Troubleshooting

### Issue: "GEMINI_API_KEY is missing"
**Solution:** 
1. Create `backend/.env` file
2. Add: `GEMINI_API_KEY=AIzaSyDw8YbKIZR-EW4pGoqm6JDMC8qNMWEgA_I`
3. Restart backend server

### Issue: "pgvector extension not found"
**Solution:**
1. Install pgvector in PostgreSQL (see Step 2)
2. RAG will be disabled until extension is installed
3. AI features will still work without RAG

### Issue: "No graded test submissions found"
**Solution:**
- This is normal if student hasn't taken any graded tests yet
- MasteryService returns neutral score (0.5) when no data exists
- Once tests are graded, mastery will be calculated automatically

### Issue: "Embeddings unavailable"
**Solution:**
- Check that GEMINI_API_KEY is set correctly
- Check backend logs for specific error messages
- Verify API key is valid and has embedding access

---

## 📊 What's Now Working

✅ **MasteryService** - Real database queries for student performance  
✅ **TopicsService** - Dynamic topic importance from database  
✅ **EmbeddingService** - Gemini embeddings enabled  
✅ **RAG Service** - Vector search ready (needs pgvector extension)  
✅ **Port Configuration** - Frontend/backend aligned  
✅ **API Key Validation** - Startup checks and clear error messages  

---

## 🚀 Next Steps

1. Add API key to `.env` file
2. Install pgvector extension (optional, for RAG)
3. Restart backend server
4. Test AI endpoints
5. Upload documents to enable RAG (future feature)

---

## 📝 Notes

- **Embedding Dimension:** Gemini `text-embedding-004` returns 768 dimensions (not 1536)
- **RAG Threshold:** Only returns documents with >70% similarity
- **Graceful Degradation:** All services handle missing data gracefully
- **No Mock Data:** Services return neutral values when data is unavailable

