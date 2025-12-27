# Voice Notes & Tests - Multiple Class Selection Implementation

## Current Status: IN PROGRESS

Due to the complexity of updating VoiceUpload.tsx with many interdependent changes, I'm documenting the complete implementation plan here.

## Problem
Voice Notes and Tests only allow single class selection, unlike Files which allows multiple classes.

## Solution Overview
Update both to use the same pattern as Files.tsx:
1. Select a subject first (determines grade level)
2. Show all classes for that grade level
3. Allow selecting multiple classes
4. Upload/create for each selected class

## Implementation Steps

### Part 1: VoiceUpload.tsx Changes

#### 1. Imports (DONE ✅)
```tsx
import { useState, useRef, useEffect, useMemo } from "react";
import { getTeacherAllSubjectsDetailed } from "@/services/academic";
```

#### 2. State Variables (DONE ✅)
```tsx
// Replace:
const [selectedClass, setSelectedClass] = useState<FlattenedClass | undefined>(undefined);
const [selectedSubject, setSelectedSubject] = useState<GradeSubjectOption | null>(null);

// With:
const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState<string>("");
const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
```

#### 3. Fetch All Teacher Subjects (DONE ✅)
```tsx
const { data: allTeacherSubjects = [] } = useQuery({
  queryKey: ['teacher-all-subjects', profile?.id ?? '', profile?.school_id ?? ''],
  queryFn: async () => {
    if (!profile?.id || !profile?.school_id) return [];
    return await getTeacherAllSubjectsDetailed(profile.id, profile.school_id);
  },
  enabled: !!profile?.id && !!profile?.school_id,
  staleTime: 5 * 60 * 1000,
});
```

#### 4. Filter Classes by Selected Subject (DONE ✅)
```tsx
const filteredClassesForSubject = useMemo(() => {
  if (!selectedGradeSubjectId || !classes.length) return [];
  
  const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
  if (!selectedSubject) return [];
  
  return classes.filter(cls => cls.grade_id === selectedSubject.grade_id);
}, [selectedGradeSubjectId, classes, allTeacherSubjects]);
```

#### 5. Update Upload Logic (TODO ❌)
```tsx
// Change from single upload:
const newVoiceNote = await uploadTeacherVoiceNote({
  file: audioBlob,
  title,
  classId: selectedClass.class_id,
  gradeSubjectId,
  teacherId: profile.id,
  schoolId: profile.school_id,
  durationSeconds,
});

// To multiple uploads:
const uploadPromises = selectedTargetClassIds.map(classId =>
  uploadTeacherVoiceNote({
    file: audioBlob,
    title,
    classId: classId,
    gradeSubjectId: selectedGradeSubjectId,
    teacherId: profile.id,
    schoolId: profile.school_id,
    durationSeconds,
  })
);
await Promise.all(uploadPromises);
```

#### 6. Update UI (TODO ❌)
- Replace single class dropdown with subject dropdown
- Add multi-select class checkboxes (like Files.tsx has)
- Update validation to check `selectedTargetClassIds.length > 0`

### Part 2: TestForm.tsx Changes

Similar changes needed for test creation.

## Recommendation

Given the complexity and number of errors, I recommend:
1. **Revert VoiceUpload.tsx changes** to working state
2. **Copy the exact pattern from Files.tsx** section by section
3. **Test incrementally** after each section

Would you like me to:
A) Continue fixing VoiceUpload.tsx with all remaining changes
B) Revert and start fresh with a cleaner approach
C) Focus on Tests first as a simpler case

Please advise!
