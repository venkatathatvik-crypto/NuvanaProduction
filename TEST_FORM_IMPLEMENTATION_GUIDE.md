# TestForm.tsx - Multiple Class Selection Implementation

## Status: ⏳ IN PROGRESS (90% Complete)

### Completed Steps ✅

1. **Schema Updated** - Changed `classId` to `classIds: z.array(z.string()).min(1)`
2. **Form Defaults Updated** - Changed `classId: ""` to `classIds: []`
3. **Imports Added** - Added `useMemo` and `getTeacherAllSubjectsDetailed`
4. **State Added** - Added `allTeacherSubjects` and `selectedGradeSubjectId`
5. **Data Fetching** - Added `getTeacherAllSubjectsDetailed` to Promise.all
6. **Class Filtering** - Added `filteredClassesForSubject` useMemo

### Remaining Steps ❌

#### 1. Update UI (Lines 419-479)

**Current Code:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <FormField
        control={form.control}
        name="classId"  // ❌ OLD
        render={({ field }) => (
            <FormItem>
                <FormLabel>Class</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    // Single class dropdown
                </Select>
            </FormItem>
        )}
    />
    
    <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
            <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select disabled={!selectedClassId}>  // ❌ Depends on class
                    {subjects.map(...)}  // ❌ Uses old subjects state
                </Select>
            </FormItem>
        )}
    />
</div>
```

**Should Be:**
```tsx
{/* Subject Selection */}
<FormItem>
    <FormLabel>Subject *</FormLabel>
    <Select
        value={selectedGradeSubjectId}
        onValueChange={(value) => {
            setSelectedGradeSubjectId(value);
            form.setValue('classIds', []); // Reset classes when subject changes
            // Find and set the subject name in form
            const subject = allTeacherSubjects.find(s => s.grade_subject_id === value);
            form.setValue('subject', subject?.subject_name || '');
        }}
    >
        <SelectTrigger>
            <SelectValue placeholder="Select Subject" />
        </SelectTrigger>
        <SelectContent>
            {allTeacherSubjects.map((subject) => (
                <SelectItem key={subject.grade_subject_id} value={subject.grade_subject_id}>
                    {subject.subject_name} ({subject.grade_name})
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
</FormItem>

{/* Multi-Class Selection */}
<FormField
    control={form.control}
    name="classIds"
    render={({ field }) => (
        <FormItem>
            <FormLabel>Select Classes * (at least one required)</FormLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg bg-secondary/5">
                {filteredClassesForSubject.length > 0 ? (
                    filteredClassesForSubject.map((cls) => {
                        const isSelected = field.value.includes(cls.class_id);
                        return (
                            <div
                                key={cls.class_id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                        : 'bg-muted border-border hover:border-primary/50 text-muted-foreground'
                                }`}
                                onClick={() => {
                                    const newValue = isSelected
                                        ? field.value.filter(id => id !== cls.class_id)
                                        : [...field.value, cls.class_id];
                                    field.onChange(newValue);
                                }}
                            >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`}>
                                    {isSelected && (
                                        <svg className="w-2 h-2 text-white fill-current" viewBox="0 0 20 20">
                                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                                        </svg>
                                    )}
                                </div>
                                <span className="text-sm font-medium">{cls.class_name}</span>
                            </div>
                        );
                    })
                ) : (
                    <p className="col-span-full text-center py-2 text-xs text-amber-500 italic">
                        {selectedGradeSubjectId ? "No classes found for this subject's grade level." : "Please select a subject first."}
                    </p>
                )}
            </div>
            <FormMessage />
        </FormItem>
    )}
/>
```

#### 2. Update TestCreate.tsx to Handle Multiple Classes

**Current Code (TestCreate.tsx line 141):**
```tsx
await createTeacherTest(testData);
```

**Should Be:**
```tsx
// Create test for each selected class
const testPromises = data.classIds.map(classId =>
    createTeacherTest({
        ...testData,
        classId: classId,
    })
);

await Promise.all(testPromises);
toast.success(`Test created successfully for ${data.classIds.length} class(es)!`);
```

#### 3. Remove Unused Code

- Remove `selectedClassId` watch (line ~220)
- Remove `fetchSubjectsForClass` useEffect (lines ~223-278)
- These are no longer needed with the new approach

### Benefits

✅ **Consistent with Files & Voice Notes** - Same UX pattern  
✅ **Time Saving** - Create test once for multiple classes  
✅ **Subject-First** - More intuitive workflow  
✅ **Grade-Level Filtering** - Only shows relevant classes  

### Testing Checklist

- [ ] Teacher can select a subject
- [ ] Classes filter by subject's grade level
- [ ] Teacher can select multiple classes
- [ ] Form validation requires at least one class
- [ ] Test is created for each selected class
- [ ] Students in all selected classes can see the test

### Files to Modify

1. ✅ `src/components/mcq/TestForm.tsx` - Schema, state, data (DONE)
2. ⏳ `src/components/mcq/TestForm.tsx` - UI section (TODO)
3. ⏳ `src/pages/teacher/TestCreate.tsx` - Submit logic (TODO)

---

## Quick Implementation Guide

To complete this:

1. Replace lines 419-479 in TestForm.tsx with the new UI code above
2. Remove lines ~220-278 (old subject fetching logic)
3. Update TestCreate.tsx handleSubmit to loop through classIds

Total changes: ~100 lines in TestForm.tsx, ~10 lines in TestCreate.tsx
