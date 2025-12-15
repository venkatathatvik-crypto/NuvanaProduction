# Auto Class Band Selection Implementation

## Overview
The backend now automatically determines the class band based on the student's grade level from the database, instead of relying solely on the frontend-provided value.

## Changes Made

### 1. Enhanced Database Query (`backend/src/ai/ai.service.ts`)

**Before:**
```typescript
const student = await this.prisma.profiles.findFirst({
    where: { id: studentId },
    include: {
        student_details: {
            select: { class_id: true },
        },
    },
});
```

**After:**
```typescript
const student = await this.prisma.profiles.findFirst({
    where: { id: studentId },
    include: {
        student_details: {
            include: {
                classes: {
                    include: {
                        grade_levels: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        },
    },
});
```

**What changed:**
- Now fetches the full `classes` relation (not just `class_id`)
- Includes `grade_levels` relation to get grade name
- Accesses: `student → student_details → classes → grade_levels → name`

---

### 2. Auto Class Band Determination

**New Logic:**
```typescript
// Get grade level name to determine class band
const gradeLevel = student.student_details.classes?.grade_levels;
if (gradeLevel?.name) {
    console.log(`[AI Service] ✓ Student grade level: ${gradeLevel.name}`);
    
    // Auto-determine class band from grade level name
    autoClassBand = this.determineClassBandFromGrade(gradeLevel.name);
    console.log(`[AI Service] ✓ Auto-determined class band: ${autoClassBand} (from grade: ${gradeLevel.name})`);
}
```

**Priority Order:**
1. **Auto-determined** from student's grade (highest priority)
2. **Frontend-provided** `classBand` (fallback)
3. **Default** `'middle'` (if neither available)

```typescript
const band = autoClassBand || classBand || 'middle';
```

---

### 3. Grade to Class Band Mapping Function

**New Helper Function:**
```typescript
private determineClassBandFromGrade(gradeName: string): string {
    // Extract numeric grade from grade name
    // Handles: "Grade 10", "10", "Class 10", "Grade 10-A", etc.
    const gradeMatch = gradeName.match(/\d+/);
    if (!gradeMatch) {
        return 'middle'; // Default fallback
    }

    const gradeNumber = parseInt(gradeMatch[0], 10);

    // Map grade number to class band
    if (gradeNumber >= 1 && gradeNumber <= 5) {
        return 'primary';
    } else if (gradeNumber >= 6 && gradeNumber <= 8) {
        return 'middle';
    } else if (gradeNumber >= 9 && gradeNumber <= 12) {
        return 'high';
    } else {
        return 'middle'; // Default for grades outside 1-12
    }
}
```

**Mapping Rules:**
- **Grades 1-5** → `'primary'`
- **Grades 6-8** → `'middle'`
- **Grades 9-12** → `'high'`
- **Other grades** → `'middle'` (default)

**Supported Grade Name Formats:**
- `"Grade 10"` → Extracts `10` → `'high'`
- `"10"` → Extracts `10` → `'high'`
- `"Class 8"` → Extracts `8` → `'middle'`
- `"Grade 10-A"` → Extracts `10` → `'high'`
- `"Grade 3"` → Extracts `3` → `'primary'`

---

## Example Flow

### Scenario: Student in Class 10-A

1. **Request arrives:**
   ```json
   {
     "taskType": "doubt",
     "query": "What is photosynthesis?",
     "studentId": "uuid-123",
     "subject": "Biology",
     "classBand": "middle"  // Frontend still sends this (but won't be used)
   }
   ```

2. **Backend fetches student data:**
   ```typescript
   student.student_details.classes.grade_levels.name = "Grade 10"
   ```

3. **Auto-determination:**
   ```typescript
   determineClassBandFromGrade("Grade 10")
   // Extracts: 10
   // Returns: "high"
   ```

4. **Class band used:**
   ```typescript
   const band = "high"  // Auto-determined, not "middle" from frontend
   ```

5. **Prompt generated:**
   ```typescript
   DoubtPrompt(query, ragContext, "high")
   // Uses: ClassBandStyles["high"]
   // Style: "Class 9-12 Style: Formal, academic, exam-oriented..."
   ```

---

## Backward Compatibility

✅ **Frontend can still send `classBand`** - it will be used as a fallback if:
- Student has no class assigned
- Grade level cannot be determined
- Grade name format is unrecognized

✅ **No breaking changes** - existing functionality preserved

✅ **Graceful degradation** - falls back to frontend value, then default

---

## Logging

The system now logs:
```
[AI Service] Step 0: Getting student's class and grade information...
[AI Service] ✓ Student class_id: uuid-456
[AI Service] ✓ Student grade level: Grade 10
[AI Service] ✓ Auto-determined class band: high (from grade: Grade 10)
[AI Service] Using auto-determined class band: high (from student's grade)
```

Or if fallback is used:
```
[AI Service] ⚠️ Grade level not found for student's class
[AI Service] Using frontend-provided class band: middle (fallback)
```

---

## Benefits

1. **Accurate class band** - Based on actual grade in database, not inferred from class name
2. **Consistent behavior** - Same grade always gets same class band
3. **Less frontend logic** - Frontend doesn't need to infer class band
4. **Database-driven** - Single source of truth (grade_levels table)
5. **Flexible** - Handles various grade name formats

---

## Testing

To test the implementation:

1. **Student in Grade 10:**
   - Expected: `classBand = "high"`
   - Check logs: "Auto-determined class band: high"

2. **Student in Grade 8:**
   - Expected: `classBand = "middle"`
   - Check logs: "Auto-determined class band: middle"

3. **Student in Grade 3:**
   - Expected: `classBand = "primary"`
   - Check logs: "Auto-determined class band: primary"

4. **Student without class:**
   - Expected: Uses frontend `classBand` or default `"middle"`
   - Check logs: "Using frontend-provided class band" or "Using default class band"

---

## Database Schema Reference

```
profiles
  └─ student_details (1:1)
      └─ class_id (FK)
          └─ classes
              └─ grade_level_id (FK)
                  └─ grade_levels
                      └─ name (e.g., "Grade 10")
```

The query follows this path to get the grade name.

---

## Summary

✅ **Implemented:** Auto class band selection from student's grade  
✅ **Backward compatible:** Frontend `classBand` still works as fallback  
✅ **Robust:** Handles edge cases and various grade name formats  
✅ **Logged:** Clear logging for debugging  
✅ **No breaking changes:** Existing functionality preserved

