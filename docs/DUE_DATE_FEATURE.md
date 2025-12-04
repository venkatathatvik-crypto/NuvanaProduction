# Due Date Feature Implementation

## Overview
Added the ability for teachers to set a due date and time for tests and assignments. This helps students know when they need to complete their assessments.

## Changes Made

### 1. Database Schema
**File:** `migrations/add_due_date_to_tests.sql`
- Added `due_date` column to the `tests` table
- Type: `TIMESTAMP WITH TIME ZONE` (optional field)

**To apply this migration:**
Run the SQL file in your Supabase SQL editor or use your migration tool.

### 2. Backend Services
**File:** `src/services/academic.ts`
- Updated `TeacherTest` interface to include `dueDate?: string`
- Updated `TestRow` interface to include `due_date?: string | null`
- Updated `CreateTestParams` interface to include `dueDate?: string`
- Modified `createTeacherTest()` to save due_date to database
- Modified `getTeacherTest()` to retrieve and return due_date
- Modified `getTeacherTests()` to retrieve and return due_date for all tests

### 3. Frontend Form
**File:** `src/components/mcq/TestForm.tsx`
- Added `dueDate` field to form schema (optional string)
- Added datetime-local input field in the form UI
- Field appears between Description and Duration/Publish section
- Includes helper text: "Set a deadline for students to complete this test"

### 4. Test Creation
**File:** `src/pages/teacher/TestCreate.tsx`
- Updated `handleSubmit` to pass `dueDate` to `createTeacherTest()`
- Converts empty string to undefined before sending to backend

### 5. Test Display
**File:** `src/pages/teacher/Tests.tsx`
- Added due date display on test cards
- Shows formatted date/time with calendar emoji (📅)
- Format: "Due: Dec 4, 2024, 01:30 PM"
- Styled with orange background for visibility
- Only displays if due date is set

## Features

### For Teachers:
1. **Optional Due Date**: Can set a deadline when creating/editing tests or assignments
2. **Date & Time Picker**: Uses native HTML5 datetime-local input for easy selection
3. **Visual Indicator**: Due dates are prominently displayed on test cards with orange styling
4. **Flexible**: Due date is completely optional - tests can be created without one

### For Students (Future Enhancement):
- Can see when tests/assignments are due
- Can prioritize work based on upcoming deadlines
- System can show warnings for approaching deadlines

## UI/UX Details

### Form Input:
- **Label**: "Due Date & Time (Optional)"
- **Type**: datetime-local (native browser picker)
- **Helper Text**: "Set a deadline for students to complete this test"
- **Validation**: Optional field, no validation required

### Display Format:
- **Color**: Orange text on orange/10 background
- **Icon**: 📅 calendar emoji
- **Format**: "Due: MMM DD, YYYY, HH:MM AM/PM"
- **Example**: "Due: Dec 4, 2024, 01:30 PM"

## Database Migration

Run this SQL in your Supabase dashboard:

```sql
ALTER TABLE tests
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN tests.due_date IS 'Optional deadline for students to complete the test/assignment';
```

## Testing Checklist

- [ ] Create a new test with a due date
- [ ] Create a new test without a due date
- [ ] Verify due date displays correctly on test card
- [ ] Verify due date is saved to database
- [ ] Verify due date is retrieved correctly
- [ ] Test with different timezones
- [ ] Verify assignment creation with due date
- [ ] Check that existing tests without due dates still work

## Future Enhancements

1. **Student View**: Show due dates in student test list
2. **Notifications**: Send reminders as due dates approach
3. **Overdue Handling**: Mark tests as overdue and prevent late submissions
4. **Calendar Integration**: Show all due dates in a calendar view
5. **Bulk Operations**: Set due dates for multiple tests at once
6. **Recurring Deadlines**: Support for recurring assignments
